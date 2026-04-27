import { AnswerPayload } from './game.types';
/**
 * Tujuan File: game.service.ts (ORCHESTRATOR)
 * Berfungsi sebagai penghubung (middleman) antara WebSocket, Database (Prisma), dan Game Engine.
 *
 * Kenapa dipisah?
 * Sesuai prinsip Clean Architecture, logic bisnis (Engine) tidak boleh tahu soal Database.
 * File ini yang bertugas mengambil data, memanggil engine, dan menyimpan hasilnya kembali.
 *
 * Alur Kerja:
 * 1. Di-trigger oleh WebSocket event.
 * 2. Ambil data dari Database (Prisma).
 * 3. Proses data dengan GameEngine.
 * 4. Simpan hasil ke Database.
 * 5. Kembalikan data ke pemanggil (WebSocket) untuk di-broadcast.
 */
export declare class GameService {
    /**
     * Proses submit jawaban dari player.
     * @param payload Data jawaban dari client
     */
    static processAnswer(payload: AnswerPayload): Promise<{
        isCorrect: boolean;
        scoreEarned: number;
        correctAnswer: string;
    }>;
    /**
     * Mulai game baru di dalam room
     */
    static startGame(roomId: string): Promise<{
        gameId: string;
        message: string;
        questionCount: number;
    }>;
}
//# sourceMappingURL=game.service.d.ts.map