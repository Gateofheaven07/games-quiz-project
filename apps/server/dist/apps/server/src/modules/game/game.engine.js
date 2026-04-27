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
export class GameEngine {
    /**
     * Cek apakah jawaban pemain benar
     */
    static checkAnswer(correctAnswer, playerAnswer) {
        if (!correctAnswer || !playerAnswer)
            return false;
        return correctAnswer.trim().toLowerCase() === playerAnswer.trim().toLowerCase();
    }
    /**
     * Hitung skor berbasis waktu.
     * Semakin cepat menjawab, semakin tinggi skornya.
     */
    static calculateScore(isCorrect, timeSpentMs) {
        if (!isCorrect)
            return 0;
        // Jika waktu habis, skor = 0
        if (timeSpentMs > this.MAX_ANSWER_TIME_MS)
            return 0;
        // Bonus kecepatan: sisa waktu / max waktu
        const timeRatio = Math.max(0, this.MAX_ANSWER_TIME_MS - timeSpentMs) / this.MAX_ANSWER_TIME_MS;
        const timeBonus = Math.round(timeRatio * 50); // Bonus max 50 poin
        return this.BASE_SCORE + timeBonus;
    }
    /**
     * Menentukan pemenang dari daftar pemain
     */
    static determineWinner(players) {
        if (players.length === 0)
            return null;
        let winner = players[0];
        for (const player of players) {
            if (player.score > winner.score) {
                winner = player;
            }
        }
        // Jika seri (bisa dikembangkan lebih lanjut)
        const topScorers = players.filter(p => p.score === winner.score);
        if (topScorers.length > 1) {
            // Logic seri bisa ditangani di sini (sementara kembalikan salah satu)
            return topScorers[0];
        }
        return winner;
    }
}
// Waktu maksimal menjawab (ms)
GameEngine.MAX_ANSWER_TIME_MS = 15000;
GameEngine.BASE_SCORE = 100;
//# sourceMappingURL=game.engine.js.map