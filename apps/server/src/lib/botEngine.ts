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

import { BOT_DIFFICULTY_CONFIGS, BotDifficulty } from './bot.types.js';
import { GameManager } from './gameManager.js';

interface BotSessionOptions {
  roomId:      string;
  botUserId:   string;
  difficulty:  BotDifficulty;
  totalQuestions: number;
  io:          any;
}

/**
 * Mulai sesi Bot untuk satu permainan.
 * Bot akan menjawab setiap soal secara otomatis dengan delay dan akurasi
 * yang dikonfigurasi berdasarkan difficulty.
 */
export function startBotSession(opts: BotSessionOptions): void {
  const { roomId, botUserId, difficulty, totalQuestions, io } = opts;
  const config = BOT_DIFFICULTY_CONFIGS[difficulty];

  console.log('[BotEngine] Session started:', { roomId, botUserId, difficulty });

  // Jadwalkan respons Bot untuk setiap soal
  for (let questionIndex = 0; questionIndex < totalQuestions; questionIndex++) {
    const [minDelay, maxDelay] = config.responseDelayMs;
    // Tambah offset per soal (soal berikutnya, bot pun butuh waktu lebih)
    const baseDelay   = randomBetween(minDelay, maxDelay);
    const questionOffset = questionIndex * 31_000; // setiap soal max 30s + 1s buffer

    const totalDelay = questionOffset + baseDelay;

    setTimeout(() => {
      scheduleBotAnswer({ roomId, botUserId, questionIndex, accuracy: config.accuracy, io });
    }, totalDelay);
  }
}

/**
 * Bot menjawab satu soal.
 * Memutuskan apakah benar/salah berdasarkan accuracy, lalu emit event.
 */
function scheduleBotAnswer(opts: {
  roomId:        string;
  botUserId:     string;
  questionIndex: number;
  accuracy:      number;
  io:            any;
}): void {
  const { roomId, botUserId, questionIndex, accuracy, io } = opts;

  // Cek room masih aktif
  const room = GameManager.getRoom(roomId);
  if (!room || room.status !== 'active') return;

  const questions = GameManager.getRoomQuestions(roomId);
  const question  = questions[questionIndex];
  if (!question) return;

  // Tentukan apakah bot menjawab benar
  const isCorrect   = Math.random() < accuracy;
  const scoreEarned = isCorrect ? 10 : 0;

  // Pilih jawaban: jika benar → correctAnswer, jika salah → jawaban acak selain benar
  let chosenAnswer: number;
  if (isCorrect) {
    chosenAnswer = question.correctAnswer;
  } else {
    // Pilih index acak, bukan correctAnswer
    const wrongOptions = question.options
      .map((_, i) => i)
      .filter(i => i !== question.correctAnswer);
    chosenAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)] ?? 0;
  }

  // Update skor Bot di GameManager (memanfaatkan method yang sama dgn human)
  GameManager.submitAnswer(roomId, botUserId, chosenAnswer, scoreEarned);

  // Single Source of Truth sync
  const allScores = GameManager.getRoomScoresMap(roomId);
  io.to(roomId).emit('sync_scores', { scores: allScores });

  // Emit event yang SAMA dengan human player — Abstraction Layer
  io.to(roomId).emit('game:player_answered', {
    userId:      botUserId,
    isCorrect,
    scoreEarned,
    isBot:       true, // informasi tambahan optional untuk UI
    scores:      allScores
  });

  console.log('[BotEngine] Bot answered Q%d:', questionIndex, { isCorrect, scoreEarned, roomId });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
