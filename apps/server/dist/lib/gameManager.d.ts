import { GameRoom, Question } from '../../../packages/shared/types';
export declare class GameManager {
    static createRoom(userId: string, difficulty: string): Promise<GameRoom>;
    static joinRoom(roomId: string, userId: string): Promise<GameRoom | null>;
    static submitAnswer(roomId: string, userId: string, answer: number): boolean;
    static getRoom(roomId: string): GameRoom | null;
    static getRoomQuestions(roomId: string): Question[];
    static getPlayerAnswers(roomId: string, userId: string): number[];
    static getUserRoom(userId: string): string | null;
    static finishGame(roomId: string, userId: string): Promise<void>;
    static endRoom(roomId: string): Promise<void>;
    static getRoomList(): string[];
    static getWaitingRooms(): GameRoom[];
}
//# sourceMappingURL=gameManager.d.ts.map