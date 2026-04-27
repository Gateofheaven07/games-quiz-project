import { Socket } from 'socket.io';
import { verifyToken } from './auth';
import { GameManager } from './gameManager';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export function setupSocketHandlers(io: any) {
  io.use((socket: AuthenticatedSocket, next: Function) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication failed: Missing token'));
      }

      const payload = verifyToken(token);
      if (!payload) {
        return next(new Error('Authentication failed: Invalid token'));
      }

      socket.userId = payload.userId;
      socket.username = payload.username;
      console.log('[Socket Auth] User authenticated:', {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      console.error('[Socket Auth] Error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('[Socket] User connected:', {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
    });

    socket.on('user:create_room', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'User not authenticated');
          return;
        }

        const { difficulty = 'medium' } = data;
        const room = await GameManager.createRoom(socket.userId, difficulty);

        socket.join(room.id);
        socket.emit('room:created', {
          roomId: room.id,
          players: [socket.userId],
          status: 'waiting',
        });

        console.log('[Socket] Room created:', { roomId: room.id, userId: socket.userId });
      } catch (error) {
        console.error('[Socket] Error creating room:', error);
        socket.emit('error', 'Failed to create room');
      }
    });

    socket.on('user:join_room', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'User not authenticated');
          return;
        }

        const { roomId } = data;
        const room = await GameManager.joinRoom(roomId, socket.userId);

        if (!room) {
          socket.emit('error', 'Room not found or not available');
          return;
        }

        socket.join(roomId);

        // Send questions to both players
        const questions = GameManager.getRoomQuestions(roomId);
        io.to(roomId).emit('room:ready', {
          roomId,
          questions: questions.map((q) => ({
            ...q,
            correctAnswer: undefined, // Don't send correct answer
          })),
        });

        // Send first question
        if (questions.length > 0) {
          io.to(roomId).emit('game:question', {
            question: {
              ...questions[0],
              correctAnswer: undefined,
            },
            index: 0,
            total: questions.length,
          });
        }

        console.log('[Socket] User joined room:', { roomId, userId: socket.userId });
      } catch (error) {
        console.error('[Socket] Error joining room:', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    socket.on('game:submit_answer', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'User not authenticated');
          return;
        }

        const { answer, questionIndex } = data;
        const roomId = GameManager.getUserRoom(socket.userId);

        if (!roomId) {
          socket.emit('error', 'User not in a room');
          return;
        }

        GameManager.submitAnswer(roomId, socket.userId, answer);
        const room = GameManager.getRoom(roomId);
        const questions = GameManager.getRoomQuestions(roomId);

        // Notify room of answer submission
        io.to(roomId).emit('game:answer_received', {
          playerIndex: room?.player1 === socket.userId ? 0 : 1,
        });

        // Check if we should move to next question
        const nextIndex = questionIndex + 1;
        if (nextIndex < questions.length) {
          setTimeout(() => {
            io.to(roomId).emit('game:question', {
              question: {
                ...questions[nextIndex],
                correctAnswer: undefined,
              },
              index: nextIndex,
              total: questions.length,
            });
          }, 2000);
        }

        console.log('[Socket] Answer submitted:', {
          roomId,
          userId: socket.userId,
          questionIndex,
          answer,
        });
      } catch (error) {
        console.error('[Socket] Error submitting answer:', error);
        socket.emit('error', 'Failed to submit answer');
      }
    });

    socket.on('game:finish', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', 'User not authenticated');
          return;
        }

        const roomId = GameManager.getUserRoom(socket.userId);
        if (!roomId) {
          socket.emit('error', 'User not in a room');
          return;
        }

        await GameManager.finishGame(roomId, socket.userId);

        // Notify room that player finished
        io.to(roomId).emit('game:player_finished', {
          userId: socket.userId,
          username: socket.username,
        });

        console.log('[Socket] Game finished:', { roomId, userId: socket.userId });
      } catch (error) {
        console.error('[Socket] Error finishing game:', error);
        socket.emit('error', 'Failed to finish game');
      }
    });

    socket.on('disconnect', async () => {
      try {
        if (socket.userId) {
          const roomId = GameManager.getUserRoom(socket.userId);
          if (roomId) {
            socket.leave(roomId);
            io.to(roomId).emit('game:player_disconnected', {
              userId: socket.userId,
              username: socket.username,
            });
          }
        }

        console.log('[Socket] User disconnected:', {
          socketId: socket.id,
          userId: socket.userId,
        });
      } catch (error) {
        console.error('[Socket] Error on disconnect:', error);
      }
    });
  });
}

export default setupSocketHandlers;
