import { Socket } from 'socket.io';
import { verifyToken } from './auth';
import { GameManager } from './gameManager';
import { PrismaClient } from '@prisma/client';
import { enqueue, remove, isWaiting, getQueueStats } from './matchmakingQueue';
import { BotDifficulty, BOT_DIFFICULTY_CONFIGS } from './bot.types';
import { startBotSession } from './botEngine';

const prisma = new PrismaClient();

// Track online users: userId → socketId
const onlineUsers = new Map<string, string>();

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────
// Track users who are "busy" (in bot match / active game) and should NOT
// be added to the public matchmaking queue
const busyUsers = new Set<string>();

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
        io.to(roomId).emit('matchmaking:game_ready', {
          roomId,
          categoryId,
          questions,        // sanitized (no correctAnswer)
          players: {
            player1: { userId: socket.userId,   username: socket.username },
            player2: { userId: opponent.userId, username: opponent.username },
          },
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

        // Emit game_ready — interface SAMA dengan mode Human (Abstraction Layer)
        socket.emit('matchmaking:game_ready', {
          roomId,
          categoryId,
          questions,
          isVsBot:    true,
          difficulty,
          players: {
            player1: { userId: socket.userId, username: socket.username },
            player2: { userId: botUserId,     username: `QuizBot [${config.label}]`, isBot: true },
          },
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

        io.to(roomId).emit('matchmaking:game_ready', {
          roomId,
          categoryId,
          questions,
          players: {
            player1: { userId: hostUserId,    username: hostUsername },
            player2: { userId: socket.userId, username: socket.username },
          },
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

    socket.on('game:submit_answer', async (data: { answer: number; questionIndex: number }) => {
      try {
        if (!socket.userId) return;
        const roomId = GameManager.getUserRoom(socket.userId);
        if (!roomId) return;

        const { answer, questionIndex } = data;
        const questions = GameManager.getRoomQuestions(roomId);
        const question  = questions[questionIndex];
        if (!question) return;

        const isCorrect  = question.correctAnswer === answer;
        const scoreEarned = isCorrect ? 10 : 0;

        GameManager.submitAnswer(roomId, socket.userId, answer, scoreEarned);

        socket.emit('game:answer_result', {
          isCorrect,
          scoreEarned,
          correctAnswer: question.correctAnswer,
        });

        io.to(roomId).emit('game:player_answered', {
          userId: socket.userId,
          isCorrect,
          scoreEarned,
        });
      } catch (err) {
        console.error('[Socket] Answer error:', err);
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

          const roomId = GameManager.getUserRoom(socket.userId);
          if (roomId) {
            socket.leave(roomId);
            io.to(roomId).emit('game:player_disconnected', {
              userId:   socket.userId,
              username: socket.username,
            });

            // Mark this player as finished so the game isn't stuck waiting for them
            GameManager.playerFinished(roomId, socket.userId, io);
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
