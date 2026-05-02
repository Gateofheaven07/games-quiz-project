import { Socket } from 'socket.io';
import { verifyToken } from './auth.js';
import { GameManager } from './gameManager.js';
import prisma from './prisma.js';
import { enqueue, remove, isWaiting, getQueueStats } from './matchmakingQueue.js';
import { BotDifficulty, BOT_DIFFICULTY_CONFIGS } from './bot.types.js';
import { startBotSession } from './botEngine.js';
import { submitAnswerHandler } from '../websocket/events/submitAnswer.js';

// Track online users: userId → socketId
const onlineUsers = new Map<string, string>();

// Track users who are "busy" (in bot match / active game)
const busyUsers = new Set<string>();

// Track pending invites: receiverId → { senderId, roomId, timeoutId }
const pendingInvites = new Map<string, { senderId: string; roomId: string; timeoutId: NodeJS.Timeout }>();

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────

export function setupSocketHandlers(io: any) {

  // ── Auth Middleware ─────────────────────────────────────────────────────────
  io.use((socket: AuthenticatedSocket, next: Function) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication failed: Missing token'));

      const payload = verifyToken(token);
      if (!payload) return next(new Error('Authentication failed: Invalid token'));

      socket.userId   = payload.userId;
      socket.username = payload.username;

      console.log('[Socket Auth] Authenticated:', {
        userId:   socket.userId,
        username: socket.username,
        socketId: socket.id,
      });

      next();
    } catch (err) {
      console.error('[Socket Auth] Error:', err);
      next(new Error('Authentication failed'));
    }
  });

  // ── Connection ──────────────────────────────────────────────────────────────
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('[Socket] Connected:', { socketId: socket.id, userId: socket.userId });

    // Immediately confirm handshake to client so it can unblock the UI
    socket.emit('connection_success', {
      socketId:  socket.id,
      userId:    socket.userId,
      username:  socket.username,
      timestamp: Date.now(),
    });

    // ── Presence ──────────────────────────────────────────────────────────────
    if (socket.userId) {
      onlineUsers.set(socket.userId, socket.id);
      socket.join(`user:${socket.userId}`);
      notifyFriendsPresence(socket.userId, true, io);
    }

    socket.on('presence:get_online', (friendIds: string[]) => {
      const online = friendIds.filter((id) => onlineUsers.has(id));
      socket.emit('presence:online_list', online);
    });

    /**
     * toggle_presence
     * Payload: { busy: boolean; reason?: string }
     *
     * Bot Mode Silence: client mengirim ini saat mulai/selesai mode bot.
     * Server menandai user sebagai "busy" sehingga TIDAK dimasukkan ke antrian
     * matchmaking publik, WITHOUT memutus socket.
     */
    socket.on('toggle_presence', (data: { busy: boolean; reason?: string }) => {
      if (!socket.userId) return;
      if (data.busy) {
        busyUsers.add(socket.userId);
        console.log(`[Presence] User ${socket.userId} marked BUSY (${data.reason || 'unspecified'})`);
      } else {
        busyUsers.delete(socket.userId);
        console.log(`[Presence] User ${socket.userId} marked AVAILABLE`);
      }
    });


    // ── Chat ─────────────────────────────────────────────────────────────────
    socket.on('chat:send', async (data: { receiverId: string; content: string }) => {
      try {
        if (!socket.userId) return;
        const { receiverId, content } = data;
        if (!content || !receiverId) return;

        const friendship = await prisma.friendship.findFirst({
          where: {
            status: 'ACCEPTED',
            OR: [
              { senderId: socket.userId, receiverId },
              { senderId: receiverId, receiverId: socket.userId },
            ],
          },
        });

        if (!friendship) {
          socket.emit('error', 'You are not friends with this user');
          return;
        }

        const message = await prisma.message.create({
          data: { senderId: socket.userId, receiverId, content: content.trim() },
          include: { sender: { select: { id: true, username: true } } },
        });

        const notification = await prisma.notification.create({
          data: {
            type: 'MESSAGE',
            status: 'UNREAD',
            senderId: socket.userId,
            receiverId: receiverId,
            messageId: message.id
          },
          include: {
            sender: { select: { id: true, username: true, avatar: true } },
            message: true
          }
        });

        const payload = {
          id:         message.id,
          senderId:   message.senderId,
          receiverId: message.receiverId,
          content:    message.content,
          createdAt:  message.createdAt,
          sender:     message.sender,
        };

        io.to(`user:${receiverId}`).emit('chat:message', payload);
        socket.emit('chat:message', payload);
        io.to(`user:${receiverId}`).emit('receive_message', notification);
      } catch (err) {
        console.error('[Socket] Chat send error:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('chat:typing', (data: { receiverId: string; isTyping: boolean }) => {
      if (!socket.userId) return;
      io.to(`user:${data.receiverId}`).emit('chat:typing', {
        senderId: socket.userId,
        username: socket.username,
        isTyping: data.isTyping,
      });
    });

    // ── Battle Invites ────────────────────────────────────────────────────────
    socket.on('battle:invite', async (data: { receiverId: string; categoryId: number }, callback?: (res: any) => void) => {
      try {
        if (!socket.userId || !socket.username) return;
        const { receiverId, categoryId } = data;
        
        const sendError = (message: string) => {
          if (callback) callback({ error: message });
          else socket.emit('battle:invite_error', { message });
        };

        // 1. Validation: Online Status
        if (!onlineUsers.has(receiverId)) {
          sendError('Teman sedang offline');
          return;
        }

        // 2. Validation: Busy State (in game or manually marked busy)
        const isCurrentlyInRoom = !!GameManager.getUserRoom(receiverId);
        if (busyUsers.has(receiverId) || isCurrentlyInRoom) {
          sendError('Teman sedang dalam pertandingan');
          return;
        }

        // 3. Validation: Prevent multiple invites to the same person
        if (pendingInvites.has(receiverId)) {
          sendError('Teman sedang memiliki undangan tertunda');
          return;
        }

        // 4. Tahap 1: Create Reserved Room (DB Status: RESERVED)
        // Room ID sudah dibuat di DB, tapi status belum ACTIVE.
        const { roomId, roomCode } = await GameManager.createReservedRoom(
          socket.userId,
          categoryId,
          socket.username
        );

        // 5. Create Notification Record
        const notification = await prisma.notification.create({
          data: {
            type: 'BATTLE_INVITE',
            status: 'UNREAD',
            senderId: socket.userId,
            receiverId: receiverId,
            roomId: roomId
          },
          include: {
            sender: { select: { id: true, username: true, avatar: true } },
            room: true
          }
        });

        // 6. Setup 30s Timeout
        const timeoutId = setTimeout(() => {
          if (pendingInvites.has(receiverId)) {
            const invite = pendingInvites.get(receiverId);
            if (invite && invite.roomId === roomId) {
              pendingInvites.delete(receiverId);
              // Notify receiver that invite expired
              io.to(`user:${receiverId}`).emit('battle:invite_expired', { roomId });
              // Notify sender that invite wasn't responded
              io.to(`user:${socket.userId}`).emit('battle:invite_timeout', { receiverId });
              // Cleanup room
              GameManager.endRoom(roomId);
            }
          }
        }, 30000);

        // 7. Track Pending Invite
        pendingInvites.set(receiverId, { senderId: socket.userId!, roomId, timeoutId });

        // 8. Join sender to room early (Backend only, no redirect yet)
        socket.join(roomId);
        
        // 9. Emit events
        io.to(`user:${receiverId}`).emit('receive_invite', notification);
        socket.emit('battle:invite_sent', { roomId, roomCode, categoryId, receiverId });
        
        if (callback) callback({ success: true, roomId });

        console.log(`[Battle] Phase 1: Room Reserved and Invite sent from ${socket.userId} to ${receiverId} (Room: ${roomId})`);
      } catch (err) {
        console.error('[Socket] Battle invite error:', err);
        if (callback) callback({ error: 'Gagal mengirim undangan' });
        else socket.emit('error', 'Gagal mengirim undangan');
      }
    });

    socket.on('battle:accept', async (data: { notificationId: string; roomId: string }) => {
      try {
        if (!socket.userId) return;
        const { roomId, notificationId } = data;

        const invite = pendingInvites.get(socket.userId);
        if (!invite || invite.roomId !== roomId) {
          socket.emit('battle:invite_error', { message: 'Undangan sudah kedaluwarsa' });
          // Notify sender to reset UI
          if (invite) {
             io.to(`user:${invite.senderId}`).emit('battle:invite_error', { message: 'Undangan gagal dikonfirmasi' });
          }
          return;
        }

        // 1. Clear Timeout
        clearTimeout(invite.timeoutId);
        pendingInvites.delete(socket.userId);

        // 2. Tahap 2: Activate Room (DB Status: ACTIVE)
        const result = await GameManager.activateReservedRoom(roomId, socket.userId);

        if (!result) {
          socket.emit('battle:invite_error', { message: 'Gagal mengaktifkan ruangan. Room mungkin sudah hilang.' });
          // Notify sender to reset UI
          io.to(`user:${invite.senderId}`).emit('battle:invite_error', { message: 'Koneksi terputus atau room hilang.' });
          return;
        }

        // 3. Mark Notification as Read
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'READ' }
        });

        // 4. Socket Join - Join BOTH players to the room simultaneously
        socket.join(roomId);
        const hostSocketId = onlineUsers.get(invite.senderId);
        if (hostSocketId) {
          const hostSocket = io.sockets.sockets.get(hostSocketId);
          if (hostSocket) hostSocket.join(roomId);
        }

        // 5. Notify both players to prepare (Transition UI)
        io.to(roomId).emit('matchmaking:preparing', {
          roomId,
          message: 'Lawan menerima tantangan! Menyiapkan arena...',
        });

        // 6. Load Questions (Slow operation)
        const questions = await GameManager.loadQuestionsForRoom(roomId, result.categoryId);

        // 7. Tahap 2 Final: Emit Game Ready (Trigger simultaneous redirect)
        const [p1Data, p2Data] = await Promise.all([
          prisma.user.findUnique({ where: { id: invite.senderId }, select: { id: true, username: true, level: true } }),
          prisma.user.findUnique({ where: { id: socket.userId }, select: { id: true, username: true, level: true } })
        ]);

        io.to(roomId).emit('matchmaking:game_ready', {
          roomId,
          gameId: GameManager.getRoomGameId(roomId),
          categoryId: result.categoryId,
          questions,
          players: [
            { userId: p1Data?.id || invite.senderId, username: p1Data?.username || result.hostUsername, level: p1Data?.level || 1 },
            { userId: p2Data?.id || socket.userId, username: p2Data?.username || socket.username, level: p2Data?.level || 1 },
          ],
        });

        console.log(`[Battle] Phase 2: Room Active and Game Ready for ${invite.senderId} and ${socket.userId} (Room: ${roomId})`);
      } catch (err) {
        console.error('[Socket] Battle accept error:', err);
        socket.emit('error', 'Gagal menerima undangan');
      }
    });

    socket.on('battle:decline', async (data: { notificationId: string; roomId: string }) => {
      try {
        if (!socket.userId) return;
        const { roomId, notificationId } = data;

        const invite = pendingInvites.get(socket.userId);
        if (invite && invite.roomId === roomId) {
          clearTimeout(invite.timeoutId);
          pendingInvites.delete(socket.userId);

          // Notify sender
          io.to(`user:${invite.senderId}`).emit('battle:invite_declined', { receiverId: socket.userId });
          
          // Cleanup room
          GameManager.endRoom(roomId);
        }

        // Mark Notification as Read/Declined
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'READ' }
        });
      } catch (err) {
        console.error('[Socket] Battle decline error:', err);
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // MATCHMAKING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * matchmaking:find
     * Payload: { categoryId: number }
     *
     * Flow:
     *  • Enqueue this player.
     *  • If opponent found → create room → fetch/translate questions → emit game_data_ready to both.
     *  • If not found   → emit matchmaking:searching.
     */
    socket.on('matchmaking:find', async (data: { categoryId: number }) => {
      if (!socket.userId || !socket.username) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      // Guard: jangan masukkan user yang sedang busy (mode bot / game aktif) ke antrian publik
      if (busyUsers.has(socket.userId)) {
        console.warn(`[Matchmaking] User ${socket.userId} is BUSY — skipping public queue`);
        socket.emit('matchmaking:error', { message: 'Anda sedang dalam sesi lain. Selesaikan dulu sebelum mencari lawan.' });
        return;
      }

      const categoryId = Number(data?.categoryId) || 9;

      console.log('[Matchmaking] Player searching:', {
        userId: socket.userId,
        categoryId,
        queueStats: getQueueStats(),
      });

      const opponent = enqueue({
        userId:      socket.userId,
        socketId:    socket.id,
        username:    socket.username,
        categoryId,
        enqueuedAt:  Date.now(),
      });

      if (!opponent) {
        // No opponent yet — tell client to show "Searching…"
        socket.emit('matchmaking:searching', { categoryId });
        return;
      }


      // ── Match found ────────────────────────────────────────────────────────
      console.log('[Matchmaking] Match found:', {
        player1: socket.userId,
        player2: opponent.userId,
        categoryId,
      });

      // Notify both players that an opponent was found (show transition UI)
      socket.emit('matchmaking:opponent_found', {
        opponentId:       opponent.userId,
        opponentUsername: opponent.username,
      });
      io.to(opponent.socketId).emit('matchmaking:opponent_found', {
        opponentId:       socket.userId,
        opponentUsername: socket.username,
      });

      try {
        // Create room (without question fetch — that's done separately below)
        const roomId = await GameManager.createMatchRoom(
          socket.userId,
          opponent.userId,
          categoryId
        );

        // Put both players into the Socket.io room
        socket.join(roomId);
        const opponentSocket = io.sockets.sockets.get(opponent.socketId);
        if (opponentSocket) opponentSocket.join(roomId);

        // Notify while fetching questions
        io.to(roomId).emit('matchmaking:preparing', {
          roomId,
          message: 'Menyiapkan soal pertanyaan...',
        });

        // Fetch & translate questions (the slow part — done AFTER pairing)
        const questions = await GameManager.loadQuestionsForRoom(roomId, categoryId);

        // Emit full game data to both players → frontend navigates to /game
        const [p1Data, p2Data] = await Promise.all([
          prisma.user.findUnique({ where: { id: socket.userId }, select: { id: true, username: true, level: true } }),
          prisma.user.findUnique({ where: { id: opponent.userId }, select: { id: true, username: true, level: true } })
        ]);

        io.to(roomId).emit('matchmaking:game_ready', {
          roomId,
          gameId: GameManager.getRoomGameId(roomId),
          categoryId,
          questions,        // sanitized (no correctAnswer)
          players: [
            { userId: p1Data?.id || socket.userId, username: p1Data?.username || socket.username, level: p1Data?.level || 1 },
            { userId: p2Data?.id || opponent.userId, username: p2Data?.username || opponent.username, level: p2Data?.level || 1 },
          ],
        });

        console.log('[Matchmaking] Game ready:', { roomId, categoryId });
      } catch (err) {
        console.error('[Matchmaking] Error starting game:', err);
        io.to(socket.id).emit('matchmaking:error', { message: 'Gagal memulai pertandingan. Coba lagi.' });
        io.to(opponent.socketId).emit('matchmaking:error', { message: 'Gagal memulai pertandingan. Coba lagi.' });
      }
    });

    /**
     * matchmaking:cancel
     * Player leaves the queue before being matched.
     */
    socket.on('matchmaking:cancel', () => {
      remove(socket.id);
      socket.emit('matchmaking:cancelled');
      console.log('[Matchmaking] Cancelled:', socket.id);
    });

    /**
     * matchmaking:find_bot
     * Payload: { categoryId: number; difficulty: BotDifficulty }
     *
     * Flow:
     *  • Buat Bot room langsung (tidak perlu antrian)
     *  • Fetch & translate soal
     *  • Mulai sesi Bot AI
     *  • Emit game_ready ke pemain
     */
    socket.on('matchmaking:find_bot', async (data: { categoryId: number; difficulty: BotDifficulty }) => {
      if (!socket.userId || !socket.username) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const categoryId = Number(data?.categoryId) || 9;
      const difficulty: BotDifficulty = (['EASY', 'MEDIUM', 'HARD'].includes(data?.difficulty))
        ? data.difficulty
        : 'MEDIUM';

      const config = BOT_DIFFICULTY_CONFIGS[difficulty];

      console.log('[BotMatchmaking] Player vs Bot:', {
        userId: socket.userId, categoryId, difficulty,
      });

      try {
        // Langsung beri tahu client bahwa lawan (bot) ditemukan
        socket.emit('matchmaking:opponent_found', {
          opponentId:       `bot-${difficulty.toLowerCase()}`,
          opponentUsername: `QuizBot [${config.label}]`,
          isBot:            true,
          difficulty,
        });

        // Buat Bot room di GameManager + Prisma
        const { roomId, botUserId } = await GameManager.createBotRoom(
          socket.userId,
          categoryId,
          difficulty
        );

        socket.join(roomId);

        // Notifikasi proses fetch soal
        socket.emit('matchmaking:preparing', {
          roomId,
          message: 'Menyiapkan soal untuk Latihan...',
        });

        // Fetch & translate soal (proses yang sama dengan mode Human)
        const questions = await GameManager.loadQuestionsForRoom(roomId, categoryId);

        // Emit game_ready — interface SAMA with mode Human (Abstraction Layer)
        const p1Data = await prisma.user.findUnique({ where: { id: socket.userId }, select: { id: true, username: true, level: true } });

        socket.emit('matchmaking:game_ready', {
          roomId,
          gameId: GameManager.getRoomGameId(roomId),
          categoryId,
          questions,
          isVsBot:    true,
          difficulty,
          players: [
            { userId: p1Data?.id || socket.userId, username: p1Data?.username || socket.username, level: p1Data?.level || 1 },
            { userId: botUserId, username: `QuizBot [${config.label}]`, isBot: true, level: config.label === 'Sulit' ? 99 : config.label === 'Sedang' ? 10 : 1 },
          ],
        });

        // Jalankan Bot AI engine — Bot akan auto-jawab soal dengan delay
        startBotSession({
          roomId,
          botUserId,
          difficulty,
          totalQuestions: questions.length,
          io,
        });

        console.log('[BotMatchmaking] Game ready vs Bot:', { roomId, difficulty });
      } catch (err) {
        console.error('[BotMatchmaking] Error starting bot game:', err);
        socket.emit('matchmaking:error', { message: 'Gagal memulai mode Latihan. Coba lagi.' });
      }
    });

    /**
     * matchmaking:invite_room
     * Create a private room and return its code to share.
     */
    socket.on('matchmaking:invite_room', async (data: { categoryId: number }) => {
      if (!socket.userId || !socket.username) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      try {
        const categoryId = Number(data?.categoryId) || 9;
        const { roomId, roomCode } = await GameManager.createPrivateRoom(
          socket.userId,
          categoryId
        );

        socket.join(roomId);
        socket.emit('matchmaking:room_created', {
          roomId,
          roomCode,
          categoryId,
          hostUsername: socket.username,
        });

        console.log('[Matchmaking] Private room created:', { roomId, roomCode });
      } catch (err) {
        console.error('[Matchmaking] Error creating private room:', err);
        socket.emit('error', 'Gagal membuat room. Coba lagi.');
      }
    });

    /**
     * matchmaking:join_room
     * Join a private room by code.
     */
    socket.on('matchmaking:join_room', async (data: { roomCode: string }) => {
      if (!socket.userId || !socket.username) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      try {
        const roomCode = (data?.roomCode || '').toUpperCase().trim();
        const result   = await GameManager.joinPrivateRoom(roomCode, socket.userId);

        if (!result) {
          socket.emit('matchmaking:room_not_found', { roomCode });
          return;
        }

        const { roomId, categoryId, hostUserId, hostUsername } = result;
        socket.join(roomId);

        // Fetch & translate questions
        io.to(roomId).emit('matchmaking:preparing', {
          roomId,
          message: 'Lawan ditemukan! Menyiapkan soal...',
        });

        const questions = await GameManager.loadQuestionsForRoom(roomId, categoryId);

        // Fetch levels for both players
        const [p1Data, p2Data] = await Promise.all([
          prisma.user.findUnique({ where: { id: hostUserId }, select: { id: true, username: true, level: true } }),
          prisma.user.findUnique({ where: { id: socket.userId }, select: { id: true, username: true, level: true } })
        ]);

        io.to(roomId).emit('matchmaking:game_ready', {
          roomId,
          gameId: GameManager.getRoomGameId(roomId),
          categoryId,
          questions,
          players: [
            { userId: hostUserId,    username: p1Data?.username || hostUsername, level: p1Data?.level || 1 },
            { userId: socket.userId, username: p2Data?.username || socket.username, level: p2Data?.level || 1 },
          ],
        });

        console.log('[Matchmaking] Private room joined, game ready:', { roomId });
      } catch (err) {
        console.error('[Matchmaking] Error joining private room:', err);
        socket.emit('error', 'Gagal bergabung ke room. Coba lagi.');
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // GAMEPLAY
    // ─────────────────────────────────────────────────────────────────────────

    socket.on('game:submit_answer', async (data: { answer: number; questionIndex: number; roomId: string; gameId: string; questionId: string; timeSpentMs?: number }) => {
      await submitAnswerHandler(socket, io, data);
    });

    socket.on('game:purge', () => {
      try {
        if (!socket.userId) return;
        
        // Remove from busy state
        busyUsers.delete(socket.userId);
        
        // Remove from matchmaking queue
        remove(socket.id);
        
        // Force leave any room
        const roomId = GameManager.getUserRoom(socket.userId);
        if (roomId) {
          socket.leave(roomId);
          GameManager.endRoom(roomId);
          console.log(`[Socket] Force purged user ${socket.userId} from room ${roomId}`);
        }
      } catch (err) {
        console.error('[Socket] Purge error:', err);
      }
    });

    socket.on('game:surrender', (data: { roomId: string }) => {
      try {
        if (!socket.userId || !data.roomId) return;
        
        console.log(`[Socket] User ${socket.userId} surrendered in room ${data.roomId}`);
        GameManager.playerSurrendered(data.roomId, socket.userId, io);
      } catch (err) {
        console.error('[Socket] Surrender error:', err);
      }
    });

    socket.on('game:rejoin', async (data: { roomId: string }) => {
      try {
        if (!socket.userId) return;
        const roomId = data.roomId;
        const room = GameManager.getRoom(roomId);
        if (room && (room.player1 === socket.userId || room.player2 === socket.userId)) {
          socket.join(roomId);
          console.log(`[Socket] Player ${socket.userId} rejoined room ${roomId}`);
          
          // Emit full game data to the rejoining player so their UI can catch up
          const questions = GameManager.getRoomQuestions(roomId);
          const [p1Data, p2Data] = await Promise.all([
            prisma.user.findUnique({ where: { id: room.player1 }, select: { id: true, username: true, level: true } }),
            room.player2 ? prisma.user.findUnique({ where: { id: room.player2 }, select: { id: true, username: true, level: true } }) : Promise.resolve(null)
          ]);

          socket.emit('matchmaking:game_ready', {
            roomId,
            gameId: GameManager.getRoomGameId(roomId),
            categoryId: GameManager.getRoomCategoryId(roomId) || 9,
            questions,
            players: [
              { userId: room.player1, username: p1Data?.username || '', level: p1Data?.level || 1 },
              { userId: room.player2 || '', username: p2Data?.username || '', level: p2Data?.level || 1 },
            ],
          });
        }
      } catch (err) {
        console.error('[Socket] Rejoin error:', err);
      }
    });

    socket.on('game:finish', async () => {
      try {
        if (!socket.userId) return;
        const roomId = GameManager.getUserRoom(socket.userId);
        if (!roomId) return;

        io.to(roomId).emit('game:player_finished', {
          userId:   socket.userId,
          username: socket.username,
        });

        // Register that this player is done
        GameManager.playerFinished(roomId, socket.userId, io);
      } catch (err) {
        console.error('[Socket] Finish error:', err);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      try {
        console.log('[Socket] Disconnected:', { socketId: socket.id, reason });

        // Remove from matchmaking queue if waiting
        remove(socket.id);

        if (socket.userId) {
          // Cleanup: hapus dari daftar busy agar tidak stuck
          busyUsers.delete(socket.userId);

          onlineUsers.delete(socket.userId);
          notifyFriendsPresence(socket.userId, false, io);

          // Cleanup pending invite if this user was a receiver
          const invite = pendingInvites.get(socket.userId);
          if (invite) {
            clearTimeout(invite.timeoutId);
            pendingInvites.delete(socket.userId);
          }

          const roomId = GameManager.getUserRoom(socket.userId);
          if (roomId) {
            socket.leave(roomId);
            
            // Treat disconnection during an active game as a surrender/exit
            // so the opponent is not left hanging.
            console.log(`[Socket] Player ${socket.userId} disconnected during active game ${roomId}. Treating as surrender.`);
            GameManager.playerSurrendered(roomId, socket.userId, io);
          }
        }
      } catch (err) {
        console.error('[Socket] Disconnect error:', err);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function notifyFriendsPresence(userId: string, isOnline: boolean, io: any) {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    });

    for (const f of friendships) {
      const friendId = f.senderId === userId ? f.receiverId : f.senderId;
      io.to(`user:${friendId}`).emit('presence:update', { userId, isOnline });
    }
  } catch (err) {
    console.error('[Socket] Presence notify error:', err);
  }
}

export default setupSocketHandlers;
