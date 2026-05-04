import { Player } from './game.types.js';

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
  // Waktu maksimal menjawab (ms)
  private static MAX_ANSWER_TIME_MS = 15000;
  private static BASE_SCORE = 100;

  /**
   * Cek apakah jawaban pemain benar.
   * ✅ Normalisasi ke string untuk mendukung perbandingan index (e.g. "0" === "0")
   */
  static checkAnswer(correctAnswer: string | number, playerAnswer: string | number): boolean {
    if (correctAnswer === null || correctAnswer === undefined) return false;
    if (playerAnswer === null || playerAnswer === undefined) return false;
    // Normalisasi: trim whitespace dan bandingkan sebagai string lowercase
    return String(correctAnswer).trim().toLowerCase() === String(playerAnswer).trim().toLowerCase();
  }

  /**
   * Hitung skor flat: 10 poin per jawaban benar.
   * NOTE: Scoring di game.service.ts sudah di-override menjadi flat 10,
   * fungsi ini tetap dipertahankan untuk backward compatibility.
   */
  static calculateScore(isCorrect: boolean, timeSpentMs: number): number {
    if (!isCorrect) return 0;
    return 10; // Flat 10 poin per jawaban benar
  }

  /**
   * Menentukan pemenang dari daftar pemain
   */
  static determineWinner(players: Player[]): Player | null {
    if (players.length === 0) return null;

    let winner = players[0];
    let isDraw = false;
    
    for (let i = 1; i < players.length; i++) {
      if (players[i].score > winner.score) {
        winner = players[i];
        isDraw = false;
      } else if (players[i].score === winner.score) {
        isDraw = true;
      }
    }

    // Jika terjadi seri pada skor tertinggi, kembalikan null (Indikasi Draw)
    if (isDraw) return null;

    return winner;
  }
}
