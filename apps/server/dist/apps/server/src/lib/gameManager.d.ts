import { GameRoom, Question } from '@quiz-battle/shared';
export declare class GameManager {
    static createRoom(userId: string, categoryId: number): Promise<GameRoom>;
    static joinRoom(roomId: string, userId: string): Promise<GameRoom | null>;
    static submitAnswer(roomId: string, userId: string, answer: number, scoreEarned: number): boolean;
    static getRoom(roomId: string): GameRoom | null;
    static getRoomQuestions(roomId: string): Question[];
    static getUserRoom(userId: string): string | null;
    static finishRoom(roomId: string, io: any): Promise<void>;
    static endRoom(roomId: string): void;
    static getWaitingRooms(): GameRoom[];
}
//# sourceMappingURL=gameManager.d.ts.map