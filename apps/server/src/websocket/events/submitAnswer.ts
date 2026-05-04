import { AuthenticatedSocket } from '../../lib/socketHandlers.js';
import { GameService } from '../../modules/game/game.service.js';
import { GameManager } from '../../lib/gameManager.js';
import { AnswerPayload } from '../../modules/game/game.types.js';

/**
 * Event: game:submit_answer
 * 
 * Kenapa dipisah?
 * Sesuai prinsip Clean Architecture, file event ini hanya bertugas menerima
 * request dari Socket.IO dan meresponsnya, tanpa ada logic bisnis di sini.
 */
export async function submitAnswerHandler(socket: AuthenticatedSocket, io: any, data: any) {
  try {
    if (!socket.userId) {
      socket.emit('error', 'User not authenticated');
      return;
    }

    // Buat payload untuk service
    const payload: AnswerPayload = {
      userId: socket.userId,
      roomId: data.roomId,
      gameId: data.gameId,
      questionId: data.questionId,
      answer: data.answer,
      timeSpentMs: data.timeSpentMs || 0,
    };

    console.log(`[submitAnswer] Processing: userId=${socket.userId}, roomId=${data.roomId}, answer=${data.answer}, questionId=${data.questionId}`);

    // Panggil Orchestrator (GameService)
    const result = await GameService.processAnswer(payload);

    console.log(`[submitAnswer] Result: isCorrect=${result.isCorrect}, scoreEarned=${result.scoreEarned}, newScore=${result.newScore}`);

    // 1. Kirim hasil jawaban HANYA ke pemain yang menjawab (untuk UI feedback)
    socket.emit('game:answer_result', {
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      scoreEarned: result.scoreEarned,
    });

    // 2. Ambil FULL STATE skor dari in-memory GameManager (Single Source of Truth)
    //    GameManager sudah di-update oleh processAnswer, lebih cepat daripada re-query DB
    const allScores = GameManager.getRoomScoresMap(data.roomId);

    console.log(`[submitAnswer] Broadcasting game:state_sync to room ${data.roomId}:`, allScores);

    // 3. BROADCAST full state ke SELURUH client dalam room
    //    Semua client (termasuk pengirim) mendapat state yang identik dari server
    io.to(data.roomId).emit('game:state_sync', {
      scores: allScores,           // { userId1: 10, userId2: 20, ... }
      answeredBy: socket.userId,   // siapa yang menjawab (untuk UI effect lawan)
      isCorrect: result.isCorrect, // apakah jawaban benar (untuk animasi lawan)
    });

    // Debug log — verifikasi bahwa broadcast dikirim ke semua client
    if (process.env.NODE_ENV !== 'production') {
      const roomSockets = await io.in(data.roomId).fetchSockets();
      console.log(`[Broadcast] game:state_sync → Room: ${data.roomId} | Clients: ${roomSockets.length} | Scores:`, allScores);
    }

  } catch (error: any) {
    console.error('[Socket] Error submitting answer:', error.message, error.stack);
    // Tetap emit answer_result agar UI tidak stuck (tanpa score update)
    socket.emit('game:answer_result', {
      isCorrect: false,
      correctAnswer: null,
      scoreEarned: 0,
      error: error.message || 'Failed to submit answer',
    });
  }
}
