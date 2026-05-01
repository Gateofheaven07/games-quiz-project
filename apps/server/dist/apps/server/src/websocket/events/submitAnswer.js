import { GameService } from '../../modules/game/game.service.js';
/**
 * Event: game:submit_answer
 *
 * Kenapa dipisah?
 * Sesuai prinsip Clean Architecture, file event ini hanya bertugas menerima
 * request dari Socket.IO dan meresponsnya, tanpa ada logic bisnis di sini.
 */
export async function submitAnswerHandler(socket, io, data) {
    try {
        if (!socket.userId) {
            socket.emit('error', 'User not authenticated');
            return;
        }
        // Buat payload untuk service
        const payload = {
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
            correctAnswer: result.correctAnswer // Bisa dikirim jika game mode memungkinkan
        });
        // Broadcast ke seluruh room bahwa pemain ini telah menjawab
        // (Bisa juga kirim update skor terbaru, tergantung kebutuhan UI)
        io.to(data.roomId).emit('game:player_answered', {
            userId: socket.userId,
            isCorrect: result.isCorrect,
            scoreEarned: result.scoreEarned,
        });
    }
    catch (error) {
        console.error('[Socket] Error submitting answer:', error.message);
        socket.emit('error', error.message || 'Failed to submit answer');
    }
}
//# sourceMappingURL=submitAnswer.js.map