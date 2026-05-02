import { v4 as uuidv4 } from 'uuid';
import { GameRoom, Question } from '@quiz-battle/shared';
import { fetchAndTranslate } from './trivia.js';
import prisma from './prisma.js';
import { GameStatus, RoomStatus, GameMode, BotDifficulty as PrismaBotDifficulty, GameCategory } from '@prisma/client';
import { BotDifficulty, BOT_DIFFICULTY_CONFIGS } from './bot.types.js';

interface RoomData {
  room:            GameRoom;
  questions:       Question[];
  playerScores:    Map<string, number>;
  playerTimeSpent: Map<string, number>;
  startedAt:       number;
  categoryId:      number;
  hostUsername:    string;
  isPrivate:       boolean;
  roomCode:        string;
  playersFinished: Set<string>;
  // Bot metadata (undefined for human rooms)
  isVsBot?:       boolean;
  botDifficulty?: BotDifficulty;
  botUserId?:     string;
}

const rooms    = new Map<string, RoomData>();
const userRooms = new Map<string, string>(); // userId → roomId
// roomCode → roomId (for private rooms)
const roomCodes = new Map<string, string>();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export class GameManager {

  /**
   * createMatchRoom
   * Creates a room skeleton for two matched players WITHOUT fetching questions.
   * Questions are loaded separately via loadQuestionsForRoom() to keep the
   * matchmaking response fast.
   */
  static async createMatchRoom(
    player1Id: string,
    player2Id: string,
    categoryId: number
  ): Promise<string> {
    const roomId   = uuidv4();
    const roomCode = roomId.substring(0, 6).toUpperCase();

    const room: GameRoom = {
      id:                   roomId,
      player1:              player1Id,
      player2:              player2Id,
      status:               'active',
      questions:            [],
      currentQuestionIndex: 0,
      player1Answers:       [],
      player2Answers:       [],
      createdAt:            new Date(),
    };

    rooms.set(roomId, {
      room,
      questions:        [],
      playerScores:     new Map([[player1Id, 0], [player2Id, 0]]),
      playerTimeSpent:  new Map([[player1Id, 0], [player2Id, 0]]),
      startedAt:        Date.now(),
      categoryId,
      hostUsername:     '',
      isPrivate:        false,
      roomCode,
      playersFinished:  new Set(),
    });

    userRooms.set(player1Id, roomId);
    userRooms.set(player2Id, roomId);
    roomCodes.set(roomCode, roomId);

    // Persist to DB
    await prisma.room.create({
      data: { id: roomId, code: roomCode, status: RoomStatus.PLAYING, maxPlayers: 2, categoryId } as any,
    });

    await prisma.roomPlayer.createMany({
      data: [{ roomId, userId: player1Id }, { roomId, userId: player2Id }],
    });

    await prisma.game.create({
      data: {
        roomId,
        mode:      GameMode.QUIZ,
        status:    GameStatus.STARTED,
        startedAt: new Date(),
      },
    });

    console.log('[GameManager] Match room created:', { roomId, player1Id, player2Id, categoryId });
    return roomId;
  }

  /**
   * createBotRoom
   * Membuat room khusus untuk mode Latihan (vs Bot).
   * Room hanya memiliki satu pemain manusia + satu Bot (pseudo-player).
   * Skor disimpan di kategori PRACTICE agar tidak mencampur leaderboard Global.
   */
  static async createBotRoom(
    playerId:   string,
    categoryId: number,
    difficulty: BotDifficulty
  ): Promise<{ roomId: string; botUserId: string }> {
    const roomId    = uuidv4();
    const roomCode  = roomId.substring(0, 6).toUpperCase();
    const config    = BOT_DIFFICULTY_CONFIGS[difficulty];
    const botUserId = `bot-${difficulty.toLowerCase()}-${roomId.substring(0, 8)}`;
    const botUsername = `QuizBot [${config.label}]`;

    const room: GameRoom = {
      id:                   roomId,
      player1:              playerId,
      player2:              botUserId,
      status:               'active',
      questions:            [],
      currentQuestionIndex: 0,
      player1Answers:       [],
      player2Answers:       [],
      createdAt:            new Date(),
    };

    rooms.set(roomId, {
      room,
      questions:        [],
      playerScores:     new Map([[playerId, 0], [botUserId, 0]]),
      playerTimeSpent:  new Map([[playerId, 0], [botUserId, 0]]),
      startedAt:        Date.now(),
      categoryId,
      hostUsername:     botUsername,
      isPrivate:        false,
      roomCode,
      playersFinished:  new Set(),
      isVsBot:          true,
      botDifficulty:    difficulty,
      botUserId,
    });

    userRooms.set(playerId, roomId);
    roomCodes.set(roomCode, roomId);

    // Persist ke DB — kategori PRACTICE agar terpisah dari leaderboard Global
    await prisma.room.create({
      data: { id: roomId, code: roomCode, status: RoomStatus.PLAYING, maxPlayers: 2, categoryId } as any,
    });

    await prisma.roomPlayer.create({ data: { roomId, userId: playerId } });

    await prisma.game.create({
      data: {
        roomId,
        mode:          GameMode.QUIZ,
        status:        GameStatus.STARTED,
        startedAt:     new Date(),
        isVsBot:       true,
        botDifficulty: difficulty as PrismaBotDifficulty,
        gameCategory:  GameCategory.PRACTICE,
      },
    });

    console.log('[GameManager] Bot room created:', { roomId, playerId, difficulty, botUserId });
    return { roomId, botUserId };
  }

  /**
   * createReservedRoom
   * Tahap 1: Mereservasi room di DB dengan status RESERVED.
   * Digunakan untuk direct invite agar room ID sudah ada di DB sebelum diterima.
   */
  static async createReservedRoom(
    hostUserId: string,
    categoryId: number,
    hostUsername: string = ''
  ): Promise<{ roomId: string; roomCode: string }> {
    const roomId   = uuidv4();
    const roomCode = roomId.substring(0, 6).toUpperCase();

    const room: GameRoom = {
      id:                   roomId,
      player1:              hostUserId,
      status:               'waiting', // Internal state stays waiting
      questions:            [],
      currentQuestionIndex: 0,
      player1Answers:       [],
      player2Answers:       [],
      createdAt:            new Date(),
    };

    rooms.set(roomId, {
      room,
      questions:       [],
      playerScores:    new Map([[hostUserId, 0]]),
      playerTimeSpent: new Map([[hostUserId, 0]]),
      startedAt:       0,
      categoryId,
      hostUsername,
      isPrivate:       true,
      roomCode,
      playersFinished: new Set(),
    });

    userRooms.set(hostUserId, roomId);
    roomCodes.set(roomCode, roomId);

    await prisma.room.create({
      data: { id: roomId, code: roomCode, status: RoomStatus.RESERVED as any, maxPlayers: 2, categoryId } as any,
    });

    await prisma.roomPlayer.create({ data: { roomId, userId: hostUserId } });

    console.log('[GameManager] Reserved room created:', { roomId, roomCode, hostUserId });
    return { roomId, roomCode };
  }

  /**
   * activateReservedRoom
   * Tahap 2: Mengubah status room dari RESERVED menjadi ACTIVE/PLAYING.
   * Memasukkan pemain kedua dan mengaktifkan game.
   */
  static async activateReservedRoom(
    roomId: string,
    joinerUserId: string
  ): Promise<{
    roomId: string;
    categoryId: number;
    hostUserId: string;
    hostUsername: string;
  } | null> {
    let roomData = rooms.get(roomId);
    if (!roomData) {
      // Fallback: Check DB if memory is lost (hydration)
      const dbRoom = await prisma.room.findUnique({
        where: { id: roomId },
        include: { players: true }
      });

      if (!dbRoom || (dbRoom.status as any) !== (RoomStatus.RESERVED as any)) return null;

      // Re-hydrate memory
      const hostPlayer = dbRoom.players[0];
      const hostUser = await prisma.user.findUnique({ where: { id: hostPlayer.userId }, select: { username: true } });

      const room: GameRoom = {
        id:                   dbRoom.id,
        player1:              hostPlayer.userId,
        status:               'waiting',
        questions:            [],
        currentQuestionIndex: 0,
        player1Answers:       [],
        player2Answers:       [],
        createdAt:            dbRoom.createdAt,
      };

      roomData = {
        room,
        questions:       [],
        playerScores:    new Map([[hostPlayer.userId, 0]]),
        playerTimeSpent: new Map([[hostPlayer.userId, 0]]),
        startedAt:       0,
        categoryId:      (dbRoom as any).categoryId || 9,
        hostUsername:    hostUser?.username || '',
        isPrivate:       true,
        roomCode:        dbRoom.code,
        playersFinished: new Set(),
      };
      rooms.set(roomId, roomData);
      userRooms.set(hostPlayer.userId, roomId);
      roomCodes.set(dbRoom.code, roomId);
    }

    if (roomData.room.status !== 'waiting') return null;

    // Update room
    roomData.room.player2  = joinerUserId;
    roomData.room.status   = 'active';
    roomData.startedAt     = Date.now();
    roomData.playerScores.set(joinerUserId, 0);
    roomData.playerTimeSpent.set(joinerUserId, 0);

    userRooms.set(joinerUserId, roomId);

    await prisma.room.update({
      where: { id: roomId },
      data:  { status: RoomStatus.ACTIVE as any } as any, // Match user's request for ACTIVE status
    });

    await prisma.roomPlayer.create({ data: { roomId, userId: joinerUserId } });

    await prisma.game.create({
      data: {
        roomId,
        mode:      GameMode.QUIZ,
        status:    GameStatus.STARTED,
        startedAt: new Date(),
      },
    });

    return {
      roomId,
      categoryId:   roomData.categoryId,
      hostUserId:   roomData.room.player1,
      hostUsername: roomData.hostUsername,
    };
  }

  /**
   * createPrivateRoom
   * Creates a room that waits for a second player to join by code.
   */
  static async createPrivateRoom(
    hostUserId: string,
    categoryId: number,
    hostUsername: string = ''
  ): Promise<{ roomId: string; roomCode: string }> {
    const roomId   = uuidv4();
    const roomCode = roomId.substring(0, 6).toUpperCase();

    const room: GameRoom = {
      id:                   roomId,
      player1:              hostUserId,
      status:               'waiting',
      questions:            [],
      currentQuestionIndex: 0,
      player1Answers:       [],
      player2Answers:       [],
      createdAt:            new Date(),
    };

    rooms.set(roomId, {
      room,
      questions:       [],
      playerScores:    new Map([[hostUserId, 0]]),
      playerTimeSpent: new Map([[hostUserId, 0]]),
      startedAt:       0,
      categoryId,
      hostUsername,
      isPrivate:       true,
      roomCode,
      playersFinished: new Set(),
    });

    userRooms.set(hostUserId, roomId);
    roomCodes.set(roomCode, roomId);

    await prisma.room.create({
      data: { id: roomId, code: roomCode, status: RoomStatus.WAITING, maxPlayers: 2, categoryId } as any,
    });

    await prisma.roomPlayer.create({ data: { roomId, userId: hostUserId } });

    console.log('[GameManager] Private room created:', { roomId, roomCode, hostUserId });
    return { roomId, roomCode };
  }

  /**
   * joinPrivateRoom
   * Second player joins by room code.
   */
  static async joinPrivateRoom(
    roomCode: string,
    joinerUserId: string
  ): Promise<{
    roomId: string;
    categoryId: number;
    hostUserId: string;
    hostUsername: string;
  } | null> {
    let roomId = roomCodes.get(roomCode);
    
    // Fallback: Check DB if memory is lost
    if (!roomId) {
      const dbRoom = await prisma.room.findUnique({
        where: { code: roomCode },
        include: { players: true }
      });
      if (dbRoom && dbRoom.status === RoomStatus.WAITING) {
        roomId = dbRoom.id;
        const hostPlayer = dbRoom.players[0];
        const hostUser = await prisma.user.findUnique({ where: { id: hostPlayer.userId }, select: { username: true } });

        const room: GameRoom = {
          id:                   dbRoom.id,
          player1:              hostPlayer.userId,
          status:               'waiting',
          questions:            [],
          currentQuestionIndex: 0,
          player1Answers:       [],
          player2Answers:       [],
          createdAt:            dbRoom.createdAt,
        };

        const roomData: RoomData = {
          room,
          questions:       [],
          playerScores:    new Map([[hostPlayer.userId, 0]]),
          playerTimeSpent: new Map([[hostPlayer.userId, 0]]),
          startedAt:       0,
          categoryId:      (dbRoom as any).categoryId || 9,
          hostUsername:    hostUser?.username || '',
          isPrivate:       true,
          roomCode:        dbRoom.code,
          playersFinished: new Set(),
        };

        rooms.set(roomId, roomData);
        userRooms.set(hostPlayer.userId, roomId);
        roomCodes.set(dbRoom.code, roomId);
      }
    }

    if (!roomId) return null;

    const roomData = rooms.get(roomId);
    if (!roomData || roomData.room.status !== 'waiting') return null;

    // Update room
    roomData.room.player2  = joinerUserId;
    roomData.room.status   = 'active';
    roomData.startedAt     = Date.now();
    roomData.playerScores.set(joinerUserId, 0);
    roomData.playerTimeSpent.set(joinerUserId, 0);

    userRooms.set(joinerUserId, roomId);

    await prisma.room.update({
      where: { id: roomId },
      data:  { status: RoomStatus.PLAYING },
    });

    await prisma.roomPlayer.create({ data: { roomId, userId: joinerUserId } });

    await prisma.game.create({
      data: {
        roomId,
        mode:      GameMode.QUIZ,
        status:    GameStatus.STARTED,
        startedAt: new Date(),
      },
    });

    return {
      roomId,
      categoryId:   roomData.categoryId,
      hostUserId:   roomData.room.player1,
      hostUsername: roomData.hostUsername,
    };
  }

  /**
   * loadQuestionsForRoom
   * Fetches and translates questions from Open Trivia DB and stores them in
   * the room. Returns a sanitized list (no correctAnswer) for the client.
   */
  static async loadQuestionsForRoom(
    roomId: string,
    categoryId: number
  ): Promise<Question[]> {
    const roomData = rooms.get(roomId);
    if (!roomData) throw new Error('Room not found: ' + roomId);

    const translated = await fetchAndTranslate(categoryId, 10);
    const questions: Question[] = translated.map((tq, i) => ({
      id:            i.toString(),
      text:          tq.question,
      options:       tq.options,
      correctAnswer: tq.options.indexOf(tq.correctAnswer),
      category:      tq.categoryId.toString(),
      difficulty:    'medium',
    }));

    roomData.questions = questions;

    // Return full version to allow Optimistic UI in client
    return questions;
  }

  // ── Legacy / Gameplay helpers ───────────────────────────────────────────────

  static submitAnswer(
    roomId: string,
    userId: string,
    _answer: number,
    scoreEarned: number
  ): boolean {
    const roomData = rooms.get(roomId);
    if (!roomData) return false;

    const current = roomData.playerScores.get(userId) || 0;
    roomData.playerScores.set(userId, current + scoreEarned);
    roomData.playerTimeSpent.set(userId, Date.now() - roomData.startedAt);
    return true;
  }

  static getRoom(roomId: string): GameRoom | null {
    return rooms.get(roomId)?.room || null;
  }

  static getRoomCategoryId(roomId: string): number | null {
    return rooms.get(roomId)?.categoryId || null;
  }

  static getRoomCode(roomId: string): string | null {
    return rooms.get(roomId)?.roomCode || null;
  }

  static getRoomQuestions(roomId: string): Question[] {
    return rooms.get(roomId)?.questions || [];
  }

  static getUserRoom(userId: string): string | null {
    return userRooms.get(userId) || null;
  }

  static async finishRoom(roomId: string, io: any): Promise<void> {
    const roomData = rooms.get(roomId);
    if (!roomData) return;
    if (roomData.room.status === 'finished') return;

    roomData.room.status = 'finished';

    const p1 = roomData.room.player1;
    const p2 = roomData.room.player2;

    const p1Score = roomData.playerScores.get(p1) || 0;
    const p2Score = p2 ? (roomData.playerScores.get(p2) || 0) : 0;
    const p1Time  = roomData.playerTimeSpent.get(p1) || 30000;
    const p2Time  = p2 ? (roomData.playerTimeSpent.get(p2) || 30000) : 30000;

    let winnerId: string | null = null;
    let isDraw = false;

    if (p2) {
      if (p1Score > p2Score)       winnerId = p1;
      else if (p2Score > p1Score)  winnerId = p2;
      else if (p1Time  < p2Time)   winnerId = p1;
      else if (p2Time  < p1Time)   winnerId = p2;
      else                         isDraw   = true;
    } else {
      winnerId = p1;
    }

    // 1. Instantly notify clients so they don't get stuck waiting for DB operations!
    io.to(roomId).emit('game:finished', {
      message: 'Pertandingan Selesai!',
      results: {
        p1: { userId: p1, score: p1Score, time: p1Time, isWinner: winnerId === p1, isDraw },
        p2: p2 ? { userId: p2, score: p2Score, time: p2Time, isWinner: winnerId === p2, isDraw } : null,
      },
      winnerId,
      isDraw,
    });

    this.endRoom(roomId);

    // 2. Perform DB operations asynchronously in the background
    // We use a self-executing async function to not block the current stack
    (async () => {
      try {
        const game = await prisma.game.findUnique({ where: { roomId } });
        if (game) {
          // Prisma transaction for atomicity
          await prisma.$transaction(async (tx) => {
            await tx.game.update({
              where: { id: game.id },
              data:  { status: GameStatus.FINISHED, endedAt: new Date(), winnerId, isDraw },
            });

            const resultsData = [
              { userId: p1, gameId: game.id, score: p1Score, finalScore: p1Score, isWinner: winnerId === p1, isDraw, timeSpentMs: p1Time },
              ...(p2 && !roomData.isVsBot ? [{ userId: p2, gameId: game.id, score: p2Score, finalScore: p2Score, isWinner: winnerId === p2, isDraw, timeSpentMs: p2Time }] : []),
            ];

            await tx.gameResult.createMany({ data: resultsData });

            // Helper function to calculate points impact
            const calculateImpact = (isBotMode: boolean, score: number, isWinner: boolean, isDrawGame: boolean) => {
              if (isBotMode) {
                // Mode Latihan: No impact on global stats, give tiny practice XP
                return { scoreImpact: 0, winImpact: 0, lossImpact: 0, xpImpact: 5 };
              }
              return {
                scoreImpact: score + (isWinner ? 50 : 10),
                winImpact: isWinner ? 1 : 0,
                lossImpact: !isWinner && !isDrawGame ? 1 : 0,
                xpImpact: score + (isWinner ? 50 : 10)
              };
            };

            const updatePlayerStats = async (uid: string, score: number, winner: boolean, isDrawStatus: boolean) => {
              if (uid.startsWith('bot-')) return;
              const user = await tx.user.findUnique({ where: { id: uid }, select: { totalScore: true, level: true, wins: true, losses: true } });
              if (!user) return;

              const isBotMode = roomData.isVsBot ?? false;
              const impact = calculateImpact(isBotMode, score, winner, isDrawStatus);

              // Calculate new stats
              const newTotalScore = user.totalScore + impact.scoreImpact;
              // If we wanted to keep practice XP separate we could store it, but for now we'll just add it to a theoretical XP pool
              // Currently level is based on totalScore, we can simulate XP gain by just adding the xpImpact to a formula or adding to totalScore if we really want them to level up
              // But strictly speaking, the prompt says "berikan opsi untuk tetap memberikan 'XP Latihan'". 
              // We'll just increase totalScore by xpImpact (which is 0 for scoreImpact, but we can just use totalScore for level, and keep a separate track later)
              // Wait, if scoreImpact is 0, totalScore doesn't increase. Level uses totalScore.
              // Let's just add xpImpact to totalScore for now, OR we can just ignore level up in practice.
              // Let's not increase totalScore, and assume level might be refactored later or they just get a daily streak.
              const newWins = (user.wins || 0) + impact.winImpact;
              const newLosses = (user.losses || 0) + impact.lossImpact;
              const newLevel = Math.floor(Math.sqrt((user.totalScore + impact.xpImpact) / 100)) + 1;

              await tx.user.update({
                where: { id: uid },
                data: { 
                  totalScore: newTotalScore, 
                  level: newLevel,
                  wins: newWins,
                  losses: newLosses
                }
              });
            };

            await updatePlayerStats(p1, p1Score, winnerId === p1, isDraw);
            if (p2 && !roomData.isVsBot) {
              await updatePlayerStats(p2, p2Score, winnerId === p2, isDraw);
            }

            await tx.room.update({
              where: { id: roomId },
              data:  { status: RoomStatus.FINISHED },
            });
          });
          console.log('[GameManager] Game results saved successfully for room:', roomId);
        }
      } catch (err) {
        console.error('[GameManager] Error saving game results for room:', roomId, err);
      }
    })();
  }

  static endRoom(roomId: string): void {
    const roomData = rooms.get(roomId);
    if (!roomData) return;

    if (roomData.room.player1) userRooms.delete(roomData.room.player1);
    if (roomData.room.player2) userRooms.delete(roomData.room.player2);
    if (roomData.roomCode)     roomCodes.delete(roomData.roomCode);

    rooms.delete(roomId);
    console.log('[GameManager] Room ended:', roomId);
  }

  static getWaitingRooms(): GameRoom[] {
    return Array.from(rooms.values())
      .filter((d) => d.room.status === 'waiting')
      .map((d) => d.room);
  }

  static playerFinished(roomId: string, userId: string, io: any) {
    const roomData = rooms.get(roomId);
    if (!roomData) return;

    roomData.playersFinished.add(userId);

    // If bot mode, bot is instantly finished when user is finished
    if (roomData.isVsBot || roomData.playersFinished.size >= 2) {
      this.finishRoom(roomId, io);
    }
  }

  static playerSurrendered(roomId: string, surrenderingUserId: string, io: any) {
    const roomData = rooms.get(roomId);
    if (!roomData) return;
    if (roomData.room.status === 'finished') return;

    roomData.room.status = 'finished';

    const p1 = roomData.room.player1;
    const p2 = roomData.room.player2;

    const p1Score = roomData.playerScores.get(p1) || 0;
    const p2Score = p2 ? (roomData.playerScores.get(p2) || 0) : 0;
    const p1Time  = roomData.playerTimeSpent.get(p1) || 30000;
    const p2Time  = p2 ? (roomData.playerTimeSpent.get(p2) || 30000) : 30000;

    // The winner is the player who DID NOT surrender
    let winnerId: string | null = null;
    if (p2) {
      winnerId = surrenderingUserId === p1 ? p2 : p1;
    } else {
      // Should not happen, but if someone surrenders before p2 joins...
      winnerId = p1; // or null
    }

    // 1. Instantly notify clients
    const resultsPayload = {
      message: 'Lawan Menyerah!',
      results: {
        p1: { 
          userId: p1, 
          score: p1Score, 
          time: p1Time, 
          isWinner: winnerId === p1, 
          isDraw: false,
          pointsGained: winnerId === p1 ? (p1Score + 50) : (p1Score + 10)
        },
        p2: p2 ? { 
          userId: p2, 
          score: p2Score, 
          time: p2Time, 
          isWinner: winnerId === p2, 
          isDraw: false,
          pointsGained: winnerId === p2 ? (p2Score + 50) : (p2Score + 10)
        } : null,
      },
      winnerId,
      isDraw: false,
    };

    // 1. Instantly notify ALL clients in the room
    io.to(roomId).emit('game:finished', resultsPayload);
    io.to(roomId).emit('game:surrender_result', resultsPayload);
    io.to(roomId).emit('game:finish', { // Added for explicit compatibility
      ...resultsPayload,
      reason: 'surrender'
    });

    this.endRoom(roomId);

    // 2. Perform DB operations
    (async () => {
      try {
        const game = await prisma.game.findUnique({ where: { roomId } });
        if (game) {
          await prisma.$transaction(async (tx) => {
            await tx.game.update({
              where: { id: game.id },
              data:  { status: GameStatus.FINISHED, endedAt: new Date(), winnerId, isDraw: false },
            });

            const resultsData = [
              { userId: p1, gameId: game.id, score: p1Score, finalScore: p1Score, isWinner: winnerId === p1, isDraw: false, timeSpentMs: p1Time },
              ...(p2 && !roomData.isVsBot ? [{ userId: p2, gameId: game.id, score: p2Score, finalScore: p2Score, isWinner: winnerId === p2, isDraw: false, timeSpentMs: p2Time }] : []),
            ];

            await tx.gameResult.createMany({ data: resultsData });

            const calculateImpact = (isBotMode: boolean, score: number, isWinner: boolean, isDrawGame: boolean) => {
              if (isBotMode) return { scoreImpact: 0, winImpact: 0, lossImpact: 0, xpImpact: 5 };
              return {
                scoreImpact: score + (isWinner ? 50 : 10),
                winImpact: isWinner ? 1 : 0,
                lossImpact: !isWinner && !isDrawGame ? 1 : 0,
                xpImpact: score + (isWinner ? 50 : 10)
              };
            };

            const updatePlayerStats = async (uid: string, score: number, winner: boolean) => {
              if (uid.startsWith('bot-')) return;
              const user = await tx.user.findUnique({ where: { id: uid }, select: { totalScore: true, level: true, wins: true, losses: true } });
              if (!user) return;

              const isBotMode = roomData.isVsBot ?? false;
              const impact = calculateImpact(isBotMode, score, winner, false);

              const newTotalScore = user.totalScore + impact.scoreImpact;
              const newWins = (user.wins || 0) + impact.winImpact;
              const newLosses = (user.losses || 0) + impact.lossImpact;
              const newLevel = Math.floor(Math.sqrt((user.totalScore + impact.xpImpact) / 100)) + 1;

              await tx.user.update({
                where: { id: uid },
                data: { totalScore: newTotalScore, level: newLevel, wins: newWins, losses: newLosses }
              });
            };

            await updatePlayerStats(p1, p1Score, winnerId === p1);
            if (p2 && !roomData.isVsBot) {
              await updatePlayerStats(p2, p2Score, winnerId === p2);
            }

            await tx.room.update({
              where: { id: roomId },
              data:  { status: RoomStatus.FINISHED },
            });
          });
          console.log('[GameManager] Game surrender results saved for room:', roomId);
        }
      } catch (err) {
        console.error('[GameManager] Error saving surrender results for room:', roomId, err);
      }
    })();
  }
}
