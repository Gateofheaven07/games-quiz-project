/**
 * botEngine.ts
 *
 * Server-side Bot AI Engine.
 * Bot mensimulasikan pemain manusia:
 *  - Delay respons berdasarkan difficulty
 *  - Akurasi menjawab berdasarkan difficulty
 *  - Emit event yang sama dengan human player melalui Socket.io room
 *
 * Abstraction: socketHandlers tidak perlu tahu apakah lawan Bot atau Human;
 * Bot engine mengemulasi event yang sama (`game:player_answered`).
 */
import { BotDifficulty } from './bot.types.js';
interface BotSessionOptions {
    roomId: string;
    botUserId: string;
    difficulty: BotDifficulty;
    totalQuestions: number;
    io: any;
}
/**
 * Mulai sesi Bot untuk satu permainan.
 * Bot akan menjawab setiap soal secara otomatis dengan delay dan akurasi
 * yang dikonfigurasi berdasarkan difficulty.
 */
export declare function startBotSession(opts: BotSessionOptions): void;
export {};
//# sourceMappingURL=botEngine.d.ts.map