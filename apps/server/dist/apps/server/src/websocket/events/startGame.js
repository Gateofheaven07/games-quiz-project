import { GameService } from '../../modules/game/game.service.js';
/**
 * Event: game:start
 *
 * Kenapa dipisah?
 * Memisahkan tanggung jawab menerima request socket dengan logic pembuatan state game.
 */
export async function startGameHandler(socket, io, data) {
    try {
        if (!socket.userId) {
            socket.emit('error', 'User not authenticated');
            return;
        }
        const { roomId, categoryId } = data;
        if (!roomId) {
            socket.emit('error', 'Room ID is required');
            return;
        }
        if (!categoryId) {
            socket.emit('error', 'Category ID is required');
            return;
        }
        // Panggil Orchestrator
        const result = await GameService.startGame(roomId, categoryId);
        // Beritahu semua orang di room bahwa game dimulai
        io.to(roomId).emit('game:started', {
            gameId: result.gameId,
            message: result.message,
            questionCount: result.questionCount
        });
    }
    catch (error) {
        console.error('[Socket] Error starting game:', error.message);
        socket.emit('error', error.message || 'Failed to start game');
    }
}
//# sourceMappingURL=startGame.js.map