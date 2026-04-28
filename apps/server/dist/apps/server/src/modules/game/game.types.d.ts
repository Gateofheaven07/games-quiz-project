/**
 * Tujuan File: game.types.ts
 * Menyimpan semua definisi tipe (Type/Interface) yang digunakan dalam fitur game.
 *
 * Kenapa dipisah?
 * Agar tipe data konsisten di seluruh aplikasi (service, engine, websocket)
 * dan tidak tergantung langsung ke @prisma/client di layer types.
 */
export type GameMode = 'QUIZ' | 'CROSSWORD' | 'TETRIS';
export type GameStatus = 'WAITING' | 'STARTED' | 'FINISHED';
export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';
export type Role = 'USER' | 'ADMIN';
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
export interface AnswerResult {
    isCorrect: boolean;
    scoreEarned: number;
    correctAnswer: string;
}
export interface StartGameResult {
    gameId: string;
    message: string;
    questionCount: number;
}
//# sourceMappingURL=game.types.d.ts.map