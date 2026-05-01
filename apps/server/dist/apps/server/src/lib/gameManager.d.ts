import { GameRoom, Question } from '@quiz-battle/shared';
import { BotDifficulty } from './bot.types.js';
export declare class GameManager {
    /**
     * createMatchRoom
     * Creates a room skeleton for two matched players WITHOUT fetching questions.
     * Questions are loaded separately via loadQuestionsForRoom() to keep the
     * matchmaking response fast.
     */
    static createMatchRoom(player1Id: string, player2Id: string, categoryId: number): Promise<string>;
    /**
     * createBotRoom
     * Membuat room khusus untuk mode Latihan (vs Bot).
     * Room hanya memiliki satu pemain manusia + satu Bot (pseudo-player).
     * Skor disimpan di kategori PRACTICE agar tidak mencampur leaderboard Global.
     */
    static createBotRoom(playerId: string, categoryId: number, difficulty: BotDifficulty): Promise<{
        roomId: string;
        botUserId: string;
    }>;
    /**
     * createPrivateRoom
     * Creates a room that waits for a second player to join by code.
     */
    static createPrivateRoom(hostUserId: string, categoryId: number, hostUsername?: string): Promise<{
        roomId: string;
        roomCode: string;
    }>;
    /**
     * joinPrivateRoom
     * Second player joins by room code.
     */
    static joinPrivateRoom(roomCode: string, joinerUserId: string): Promise<{
        roomId: string;
        categoryId: number;
        hostUserId: string;
        hostUsername: string;
    } | null>;
    /**
     * loadQuestionsForRoom
     * Fetches and translates questions from Open Trivia DB and stores them in
     * the room. Returns a sanitized list (no correctAnswer) for the client.
     */
    static loadQuestionsForRoom(roomId: string, categoryId: number): Promise<Question[]>;
    static submitAnswer(roomId: string, userId: string, _answer: number, scoreEarned: number): boolean;
    static getRoom(roomId: string): GameRoom | null;
    static getRoomQuestions(roomId: string): Question[];
    static getUserRoom(userId: string): string | null;
    static finishRoom(roomId: string, io: any): Promise<void>;
    static endRoom(roomId: string): void;
    static getWaitingRooms(): GameRoom[];
    static playerFinished(roomId: string, userId: string, io: any): void;
}
//# sourceMappingURL=gameManager.d.ts.map