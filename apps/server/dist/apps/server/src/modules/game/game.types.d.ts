import { GameMode, GameStatus, RoomStatus } from '@prisma/client';
/**
 * Tujuan File: game.types.ts
 * Menyimpan semua definisi tipe (Type/Interface) yang digunakan dalam fitur game.
 *
 * Kenapa dipisah?
 * Agar tipe data konsisten di seluruh aplikasi (service, engine, websocket) dan mudah di-maintenance.
 */
export interface Player {
    userId: string;
    username: string;
    isReady: boolean;
    score: number;
}
export interface AnswerPayload {
    userId: string;
    roomId: string;
    gameId: string;
    questionId: string;
    answer: string;
    timeSpentMs: number;
}
export interface GameState {
    roomId: string;
    gameId?: string;
    mode: GameMode;
    status: GameStatus | RoomStatus;
    players: Record<string, Player>;
    currentQuestionIndex: number;
    startedAt?: Date;
}
//# sourceMappingURL=game.types.d.ts.map