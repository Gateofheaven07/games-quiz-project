import { v4 as uuidv4 } from 'uuid';
import { GameRoom, Question } from '@quiz-battle/shared';
import { fetchAndTranslate } from './trivia';
import { PrismaClient, GameStatus, RoomStatus, GameMode } from '@prisma/client';

const prisma = new PrismaClient();

interface RoomData {
  room: GameRoom;
  players: Map<string, string>; // socketId -> userId
  questions: Question[];
  playerScores: Map<string, number>;
  playerTimeSpent: Map<string, number>;
  startedAt: number;
}

const rooms = new Map<string, RoomData>();
const userRooms = new Map<string, string>(); // userId -> roomId

export class GameManager {
  static async createRoom(userId: string, categoryId: number): Promise<GameRoom> {
    const roomId = uuidv4();
    
    const translatedQuestions = await fetchAndTranslate(categoryId, 10);
    const questions: Question[] = translatedQuestions.map((tq, index) => ({
      id: index.toString(),
      text: tq.question,
      options: tq.options,
      correctAnswer: tq.options.indexOf(tq.correctAnswer),
      category: tq.categoryId.toString(),
      difficulty: 'medium',
    }));

    const room: GameRoom = {
      id: roomId,
      player1: userId,
      status: 'waiting',
      questions: questions.map((q) => ({
        ...q,
        correctAnswer: -1, // Hide correct answer from client
      })),
      currentQuestionIndex: 0,
      player1Answers: [],
      player2Answers: [],
      createdAt: new Date(),
    };

    rooms.set(roomId, {
      room,
      players: new Map([[userId, userId]]),
      questions,
      playerScores: new Map([[userId, 0]]),
      playerTimeSpent: new Map([[userId, 0]]),
      startedAt: 0,
    });

    userRooms.set(userId, roomId);

    // Save to DB
    const dbRoom = await prisma.room.create({
      data: {
        id: roomId,
        code: roomId.substring(0, 6).toUpperCase(),
        status: RoomStatus.WAITING,
        maxPlayers: 2,
      }
    });

    await prisma.roomPlayer.create({
      data: {
        roomId,
        userId,
      }
    });

    console.log('[GameManager] Room created:', { roomId, userId, categoryId });
    return room;
  }

  static async joinRoom(roomId: string, userId: string): Promise<GameRoom | null> {
    const roomData = rooms.get(roomId);
    if (!roomData) return null;

    if (roomData.room.status !== 'waiting') return null;

    roomData.room.player2 = userId;
    roomData.room.status = 'active';
    roomData.players.set(userId, userId);
    roomData.playerScores.set(userId, 0);
    roomData.playerTimeSpent.set(userId, 0);
    roomData.startedAt = Date.now(); // Start timer here

    userRooms.set(userId, roomId);

    await prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.PLAYING }
    });

    await prisma.roomPlayer.create({
      data: {
        roomId,
        userId,
      }
    });

    // Create DB Game
    const game = await prisma.game.create({
      data: {
        roomId,
        mode: GameMode.QUIZ,
        status: GameStatus.STARTED,
        startedAt: new Date(),
      }
    });

    console.log('[GameManager] User joined room:', { roomId, userId });
    return roomData.room;
  }

  static submitAnswer(roomId: string, userId: string, answer: number, scoreEarned: number): boolean {
    const roomData = rooms.get(roomId);
    if (!roomData) return false;

    // Track score
    const currentScore = roomData.playerScores.get(userId) || 0;
    roomData.playerScores.set(userId, currentScore + scoreEarned);

    // Track time spent (from start of game to this submission)
    // Actually, time is tracked iteratively or just taking the timestamp.
    // If it's cumulative, we can add the time since the last answer.
    // Simpler: total time spent = Date.now() - startedAt.
    // But since it's 30 seconds total, the last answer time is effectively their total time.
    roomData.playerTimeSpent.set(userId, Date.now() - roomData.startedAt);

    return true;
  }

  static getRoom(roomId: string): GameRoom | null {
    return rooms.get(roomId)?.room || null;
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

    if (roomData.room.status === 'finished') return; // Prevent double trigger
    roomData.room.status = 'finished';

    const p1 = roomData.room.player1;
    const p2 = roomData.room.player2;

    const p1Score = roomData.playerScores.get(p1) || 0;
    const p2Score = p2 ? (roomData.playerScores.get(p2) || 0) : 0;

    const p1Time = roomData.playerTimeSpent.get(p1) || 30000;
    const p2Time = p2 ? (roomData.playerTimeSpent.get(p2) || 30000) : 30000;

    let winnerId: string | null = null;
    let isDraw = false;

    if (p2) {
      if (p1Score > p2Score) {
        winnerId = p1;
      } else if (p2Score > p1Score) {
        winnerId = p2;
      } else {
        // Tie-breaker: speed
        if (p1Time < p2Time) {
          winnerId = p1;
        } else if (p2Time < p1Time) {
          winnerId = p2;
        } else {
          isDraw = true; // "Seri Murni"
        }
      }
    } else {
      winnerId = p1;
    }

    // Save to database
    const game = await prisma.game.findUnique({ where: { roomId } });
    if (game) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.FINISHED,
          endedAt: new Date(),
          winnerId,
          isDraw,
        }
      });

      const resultsData = [
        {
          userId: p1,
          gameId: game.id,
          score: p1Score,
          finalScore: p1Score,
          isWinner: winnerId === p1,
          isDraw,
          timeSpentMs: p1Time,
        }
      ];

      if (p2) {
        resultsData.push({
          userId: p2,
          gameId: game.id,
          score: p2Score,
          finalScore: p2Score,
          isWinner: winnerId === p2,
          isDraw,
          timeSpentMs: p2Time,
        });
      }

      await prisma.gameResult.createMany({ data: resultsData });
    }

    await prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.FINISHED }
    });

    // Notify clients in Indonesian
    io.to(roomId).emit('game:finished', { 
      message: 'Waktu habis!',
      results: {
        p1: { score: p1Score, time: p1Time, isWinner: winnerId === p1, isDraw },
        p2: p2 ? { score: p2Score, time: p2Time, isWinner: winnerId === p2, isDraw } : null
      },
      winnerId,
      isDraw
    });

    this.endRoom(roomId);
  }

  static endRoom(roomId: string): void {
    const roomData = rooms.get(roomId);
    if (!roomData) return;

    if (roomData.room.player1) userRooms.delete(roomData.room.player1);
    if (roomData.room.player2) userRooms.delete(roomData.room.player2);

    rooms.delete(roomId);
    console.log('[GameManager] Room ended:', roomId);
  }

  static getWaitingRooms(): GameRoom[] {
    return Array.from(rooms.values())
      .filter((data) => data.room.status === 'waiting')
      .map((data) => data.room);
  }
}
