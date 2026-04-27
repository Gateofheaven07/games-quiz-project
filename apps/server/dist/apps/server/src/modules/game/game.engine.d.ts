import { Player } from './game.types';
/**
 * Tujuan File: game.engine.ts (CORE LOGIC)
 * Berisi semua murni aturan permainan (business logic/game rules).
 *
 * Kenapa dipisah?
 * Agar logic permainan independen dari database atau koneksi jaringan.
 * Kita bisa dengan mudah melakukan Unit Testing pada file ini tanpa mock database.
 *
 * Alur Game Bekerja:
 * 1. Engine menerima input (jawaban, waktu).
 * 2. Engine menghitung hasil (benar/salah, penambahan skor).
 * 3. Engine mengembalikan hasil ke service.
 */
export declare class GameEngine {
    private static MAX_ANSWER_TIME_MS;
    private static BASE_SCORE;
    /**
     * Cek apakah jawaban pemain benar
     */
    static checkAnswer(correctAnswer: string, playerAnswer: string): boolean;
    /**
     * Hitung skor berbasis waktu.
     * Semakin cepat menjawab, semakin tinggi skornya.
     */
    static calculateScore(isCorrect: boolean, timeSpentMs: number): number;
    /**
     * Menentukan pemenang dari daftar pemain
     */
    static determineWinner(players: Player[]): Player | null;
}
//# sourceMappingURL=game.engine.d.ts.map