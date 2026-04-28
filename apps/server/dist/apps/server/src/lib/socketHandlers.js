import { verifyToken } from './auth';
import { GameManager } from './gameManager';
import { submitAnswerHandler } from '../websocket/events/submitAnswer';
import { startGameHandler } from '../websocket/events/startGame';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Track online users: userId → socketId
const onlineUsers = new Map();
export function setupSocketHandlers(io) {
    io.use((socket, next) => {
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
        }
        catch (error) {
            console.error('[Socket Auth] Error:', error);
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        console.log('[Socket] User connected:', {
            socketId: socket.id,
            userId: socket.userId,
            username: socket.username,
        });
        // ── Presence: Mark user online ──────────────────────────────────────────
        if (socket.userId) {
            onlineUsers.set(socket.userId, socket.id);
            socket.join(`user:${socket.userId}`);
            notifyFriendsPresence(socket.userId, true, io);
        }
        // ── Presence: Who is online? ─────────────────────────────────────────────
        socket.on('presence:get_online', (friendIds) => {
            const online = friendIds.filter((id) => onlineUsers.has(id));
            socket.emit('presence:online_list', online);
        });
        // ── Direct Message via Socket ────────────────────────────────────────────
        socket.on('chat:send', async (data) => {
            try {
                if (!socket.userId)
                    return;
                const { receiverId, content } = data;
                if (!content || !receiverId)
                    return;
                const friendship = await prisma.friendship.findFirst({
                    where: {
                        status: 'ACCEPTED',
                        OR: [
                            { senderId: socket.userId, receiverId },
                            { senderId: receiverId, receiverId: socket.userId },
                        ],
                    },
                });
                if (!friendship) {
                    socket.emit('error', 'You are not friends with this user');
                    return;
                }
                const message = await prisma.message.create({
                    data: { senderId: socket.userId, receiverId, content: content.trim() },
                    include: { sender: { select: { id: true, username: true } } },
                });
                const payload = {
                    id: message.id,
                    senderId: message.senderId,
                    receiverId: message.receiverId,
                    content: message.content,
                    createdAt: message.createdAt,
                    sender: message.sender,
                };
                io.to(`user:${receiverId}`).emit('chat:message', payload);
                socket.emit('chat:message', payload);
            }
            catch (error) {
                console.error('[Socket] Chat send error:', error);
                socket.emit('error', 'Failed to send message');
            }
        });
        // ── Typing indicator ─────────────────────────────────────────────────────
        socket.on('chat:typing', (data) => {
            if (!socket.userId)
                return;
            io.to(`user:${data.receiverId}`).emit('chat:typing', {
                senderId: socket.userId,
                username: socket.username,
                isTyping: data.isTyping,
            });
        });
        // ── Game Events ───────────────────────────────────────────────────────────
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
            }
            catch (error) {
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
                const questions = GameManager.getRoomQuestions(roomId);
                io.to(roomId).emit('room:ready', {
                    roomId,
                    questions: questions.map((q) => ({
                        ...q,
                        correctAnswer: undefined,
                    })),
                });
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
            }
            catch (error) {
                console.error('[Socket] Error joining room:', error);
                socket.emit('error', 'Failed to join room');
            }
        });
        socket.on('game:submit_answer', async (data) => {
            await submitAnswerHandler(socket, io, data);
        });
        socket.on('game:start', async (data) => {
            await startGameHandler(socket, io, data);
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
                io.to(roomId).emit('game:player_finished', {
                    userId: socket.userId,
                    username: socket.username,
                });
                console.log('[Socket] Game finished:', { roomId, userId: socket.userId });
            }
            catch (error) {
                console.error('[Socket] Error finishing game:', error);
                socket.emit('error', 'Failed to finish game');
            }
        });
        socket.on('disconnect', async () => {
            try {
                if (socket.userId) {
                    onlineUsers.delete(socket.userId);
                    notifyFriendsPresence(socket.userId, false, io);
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
            }
            catch (error) {
                console.error('[Socket] Error on disconnect:', error);
            }
        });
    });
}
async function notifyFriendsPresence(userId, isOnline, io) {
    try {
        const friendships = await prisma.friendship.findMany({
            where: {
                status: 'ACCEPTED',
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            select: { senderId: true, receiverId: true },
        });
        for (const f of friendships) {
            const friendId = f.senderId === userId ? f.receiverId : f.senderId;
            io.to(`user:${friendId}`).emit('presence:update', { userId, isOnline });
        }
    }
    catch (error) {
        console.error('[Socket] Presence notify error:', error);
    }
}
export default setupSocketHandlers;
//# sourceMappingURL=socketHandlers.js.map