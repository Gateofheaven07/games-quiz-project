import { v4 as uuidv4 } from 'uuid';
import { query } from './db';
import { GameRoom, Question } from '@quiz-battle/shared';

interface RoomData {
  room: GameRoom;
  players: Map<string, string>; // socketId -> userId
  questions: Question[];
}

const rooms = new Map<string, RoomData>();
const userRooms = new Map<string, string>(); // userId -> roomId
const playerAnswers = new Map<string, number[]>(); // roomId_userId -> answers

export class GameManager {
  static async createRoom(userId: string, difficulty: string): Promise<GameRoom> {
    const roomId = uuidv4();
    
    // Fetch questions
    const questionsResult = await query(
      `SELECT id, text, options, correct_answer, category, difficulty
       FROM questions
       WHERE difficulty = $1
       ORDER BY RANDOM()
       LIMIT 10`,
      [difficulty]
    );

    const questions: Question[] = questionsResult.rows.map((row: any) => ({
      id: row.id,
      text: row.text,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      correctAnswer: row.correct_answer,
      category: row.category,
      difficulty: row.difficulty,
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
    });

    userRooms.set(userId, roomId);
    playerAnswers.set(`${roomId}_${userId}`, []);

    console.log('[GameManager] Room created:', { roomId, userId, difficulty });
    return room;
  }

  static async joinRoom(roomId: string, userId: string): Promise<GameRoom | null> {
    const roomData = rooms.get(roomId);
    if (!roomData) {
      console.error('[GameManager] Room not found:', roomId);
      return null;
    }

    if (roomData.room.status !== 'waiting') {
      console.error('[GameManager] Room not available for joining:', roomId);
      return null;
    }

    roomData.room.player2 = userId;
    roomData.room.status = 'active';
    roomData.players.set(userId, userId);

    userRooms.set(userId, roomId);
    playerAnswers.set(`${roomId}_${userId}`, []);

    console.log('[GameManager] User joined room:', { roomId, userId });
    return roomData.room;
  }

  static submitAnswer(roomId: string, userId: string, answer: number): boolean {
    const roomData = rooms.get(roomId);
    if (!roomData) return false;

    const key = `${roomId}_${userId}`;
    const answers = playerAnswers.get(key) || [];
    answers.push(answer);
    playerAnswers.set(key, answers);

    console.log('[GameManager] Answer submitted:', { roomId, userId, answer });
    return true;
  }

  static getRoom(roomId: string): GameRoom | null {
    return rooms.get(roomId)?.room || null;
  }

  static getRoomQuestions(roomId: string): Question[] {
    return rooms.get(roomId)?.questions || [];
  }

  static getPlayerAnswers(roomId: string, userId: string): number[] {
    return playerAnswers.get(`${roomId}_${userId}`) || [];
  }

  static getUserRoom(userId: string): string | null {
    return userRooms.get(userId) || null;
  }

  static async finishGame(roomId: string, userId: string): Promise<void> {
    const roomData = rooms.get(roomId);
    if (!roomData) return;

    const answers = playerAnswers.get(`${roomId}_${userId}`) || [];
    const questions = roomData.questions;

    // Calculate score
    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (answer === questions[index]?.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Save to database
    await query(
      `INSERT INTO game_results 
       (user_id, score, correct_answers, total_questions, duration, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, score, correctCount, questions.length, 0, questions[0]?.difficulty || 'medium']
    );

    console.log('[GameManager] Game finished:', { roomId, userId, score, correctCount });
  }

  static async endRoom(roomId: string): Promise<void> {
    const roomData = rooms.get(roomId);
    if (!roomData) return;

    if (roomData.room.player1) {
      userRooms.delete(roomData.room.player1);
      playerAnswers.delete(`${roomId}_${roomData.room.player1}`);
    }
    if (roomData.room.player2) {
      userRooms.delete(roomData.room.player2);
      playerAnswers.delete(`${roomId}_${roomData.room.player2}`);
    }

    rooms.delete(roomId);
    console.log('[GameManager] Room ended:', roomId);
  }

  static getRoomList(): string[] {
    return Array.from(rooms.keys());
  }

  static getWaitingRooms(): GameRoom[] {
    return Array.from(rooms.values())
      .filter((data) => data.room.status === 'waiting')
      .map((data) => data.room);
  }
}
