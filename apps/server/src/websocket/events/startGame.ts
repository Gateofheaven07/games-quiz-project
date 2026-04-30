import { AuthenticatedSocket } from '../../lib/socketHandlers';
import { GameService } from '../../modules/game/game.service';

/**
 * Event: game:start
 * 
 * Kenapa dipisah?
 * Memisahkan tanggung jawab menerima request socket dengan logic pembuatan state game.
 */
export async function startGameHandler(socket: AuthenticatedSocket, io: any, data: any) {
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

  } catch (error: any) {
    console.error('[Socket] Error starting game:', error.message);
    socket.emit('error', error.message || 'Failed to start game');
  }
}
