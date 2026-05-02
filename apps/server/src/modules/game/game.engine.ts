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
   * Cek apakah jawaban pemain benar
   */
  static checkAnswer(correctAnswer: string, playerAnswer: string): boolean {
    if (!correctAnswer || !playerAnswer) return false;
    return correctAnswer.trim().toLowerCase() === playerAnswer.trim().toLowerCase();
  }

  /**
   * Hitung skor berbasis waktu.
   * Semakin cepat menjawab, semakin tinggi skornya.
   */
  static calculateScore(isCorrect: boolean, timeSpentMs: number): number {
    if (!isCorrect) return 0;
    
    // Jika waktu habis, skor = 0
    if (timeSpentMs > this.MAX_ANSWER_TIME_MS) return 0;

    // Bonus kecepatan: sisa waktu / max waktu
    const timeRatio = Math.max(0, this.MAX_ANSWER_TIME_MS - timeSpentMs) / this.MAX_ANSWER_TIME_MS;
    const timeBonus = Math.round(timeRatio * 50); // Bonus max 50 poin

    return this.BASE_SCORE + timeBonus;
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
