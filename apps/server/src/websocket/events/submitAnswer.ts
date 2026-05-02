import { AuthenticatedSocket } from '../../lib/socketHandlers.js';
import { GameService } from '../../modules/game/game.service.js';
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

    // Panggil Orchestrator (GameService)
    // File ini tidak tahu bagaimana skor dihitung atau disimpan,
    // murni hanya memanggil service.
    const result = await GameService.processAnswer(payload);

    // Kirim hasil spesifik ke pemain yang menjawab
    socket.emit('game:answer_result', {
      isCorrect: result.isCorrect,
      scoreEarned: result.scoreEarned,
      correctAnswer: result.correctAnswer,
      newScore: result.newScore
    });

    // 1. Ambil state skor terbaru dari SELURUH pemain di room (Single Source of Truth)
    const allScores = await GameService.getRoomScores(data.roomId);

    // 2. BROADCAST: Kirim object skor lengkap ke seluruh isi room
    io.to(data.roomId).emit('sync_scores', { 
      scores: allScores
    });

    // Tetap kirim event lama jika ada listener lain yang bergantung padanya
    io.to(data.roomId).emit('game:player_answered', {
      userId: socket.userId,
      isCorrect: result.isCorrect,
      scoreEarned: result.scoreEarned,
      scores: allScores // Opsional: tambahkan data skor ke sini juga
    });

  } catch (error: any) {
    console.error('[Socket] Error submitting answer:', error.message);
    socket.emit('error', error.message || 'Failed to submit answer');
  }
}
