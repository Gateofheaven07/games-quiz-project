import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
// All routes require authentication
router.use(authMiddleware);
// ─── SEARCH USER BY USERNAME ───────────────────────────────────────────────────
router.get('/search', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const username = req.query.username;
        if (typeof username !== 'string' || username.trim().length < 2) {
            res.status(400).json({ success: false, error: 'Username must be at least 2 characters' });
            return;
        }
        const users = await prisma.user.findMany({
            where: {
                username: { contains: username, mode: 'insensitive' },
                id: { not: userId }, // exclude self
            },
            select: { id: true, username: true, level: true, totalScore: true, wins: true },
            take: 10,
        });
        res.json({ success: true, data: users });
    }
    catch (error) {
        console.error('[Friends] Search error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── GET MY FRIENDS LIST ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userId, status: 'ACCEPTED' },
                    { receiverId: userId, status: 'ACCEPTED' },
                ],
            },
            include: {
                sender: { select: { id: true, username: true, level: true, wins: true, totalScore: true } },
                receiver: { select: { id: true, username: true, level: true, wins: true, totalScore: true } },
            },
        });
        const friends = friendships.map((f) => {
            const friend = f.senderId === userId ? f.receiver : f.sender;
            return { ...friend, friendshipId: f.id };
        });
        res.json({ success: true, data: friends });
    }
    catch (error) {
        console.error('[Friends] List error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── GET PENDING REQUESTS (received) ─────────────────────────────────────────
router.get('/requests', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const requests = await prisma.friendship.findMany({
            where: { receiverId: userId, status: 'PENDING' },
            include: {
                sender: { select: { id: true, username: true, level: true, wins: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const myFriendIds = await getAcceptedFriendIds(userId);
        // Count mutual friends for each request
        const enriched = await Promise.all(requests.map(async (req_) => {
            const theirFriendIds = await getAcceptedFriendIds(req_.senderId);
            const mutual = myFriendIds.filter((id) => theirFriendIds.includes(id)).length;
            return {
                id: req_.id,
                sender: req_.sender,
                createdAt: req_.createdAt,
                mutualCount: mutual,
            };
        }));
        res.json({ success: true, data: enriched });
    }
    catch (error) {
        console.error('[Friends] Requests error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── SEND FRIEND REQUEST ──────────────────────────────────────────────────────
router.post('/request', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username } = req.body;
        if (!username) {
            res.status(400).json({ success: false, error: 'Username is required' });
            return;
        }
        // Find target user
        const target = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true },
        });
        if (!target) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        if (target.id === userId) {
            res.status(400).json({ success: false, error: 'You cannot add yourself' });
            return;
        }
        // Check if friendship already exists
        const existing = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: target.id },
                    { senderId: target.id, receiverId: userId },
                ],
            },
        });
        if (existing) {
            if (existing.status === 'ACCEPTED') {
                res.status(409).json({ success: false, error: 'Already friends' });
            }
            else if (existing.status === 'PENDING') {
                res.status(409).json({ success: false, error: 'Friend request already sent' });
            }
            else {
                res.status(409).json({ success: false, error: 'Cannot send request to this user' });
            }
            return;
        }
        const friendship = await prisma.friendship.create({
            data: { senderId: userId, receiverId: target.id, status: 'PENDING' },
        });
        res.status(201).json({ success: true, data: { friendship, target } });
    }
    catch (error) {
        console.error('[Friends] Send request error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── ACCEPT FRIEND REQUEST ────────────────────────────────────────────────────
router.post('/accept/:friendshipId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendshipId } = req.params;
        const friendship = await prisma.friendship.findFirst({
            where: { id: friendshipId, receiverId: userId, status: 'PENDING' },
        });
        if (!friendship) {
            res.status(404).json({ success: false, error: 'Friend request not found' });
            return;
        }
        const updated = await prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: 'ACCEPTED' },
            include: { sender: { select: { id: true, username: true } } },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[Friends] Accept error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── REJECT / REMOVE FRIEND ───────────────────────────────────────────────────
router.delete('/:friendshipId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendshipId } = req.params;
        const friendship = await prisma.friendship.findFirst({
            where: {
                id: friendshipId,
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
        });
        if (!friendship) {
            res.status(404).json({ success: false, error: 'Friendship not found' });
            return;
        }
        await prisma.friendship.delete({ where: { id: friendshipId } });
        res.json({ success: true, message: 'Friend removed' });
    }
    catch (error) {
        console.error('[Friends] Remove error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── GET MESSAGES WITH A FRIEND ───────────────────────────────────────────────
router.get('/messages/:friendId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;
        // Verify they are friends
        const friendship = await prisma.friendship.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId },
                ],
            },
        });
        if (!friendship) {
            res.status(403).json({ success: false, error: 'You are not friends with this user' });
            return;
        }
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId },
                ],
            },
            include: { sender: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
        // Mark as read
        await prisma.message.updateMany({
            where: { senderId: friendId, receiverId: userId, read: false },
            data: { read: true },
        });
        res.json({ success: true, data: messages });
    }
    catch (error) {
        console.error('[Friends] Messages error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
router.post('/messages/:friendId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({ success: false, error: 'Message content is required' });
            return;
        }
        // Verify they are friends
        const friendship = await prisma.friendship.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId },
                ],
            },
        });
        if (!friendship) {
            res.status(403).json({ success: false, error: 'You are not friends with this user' });
            return;
        }
        const message = await prisma.message.create({
            data: { senderId: userId, receiverId: friendId, content: content.trim() },
            include: { sender: { select: { id: true, username: true } } },
        });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        console.error('[Friends] Send message error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── CREATE BATTLE ROOM WITH FRIEND ──────────────────────────────────────────
router.post('/battle/:friendId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;
        // Verify they are friends
        const friendship = await prisma.friendship.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId },
                ],
            },
        });
        if (!friendship) {
            res.status(403).json({ success: false, error: 'You are not friends with this user' });
            return;
        }
        // Generate a unique room code
        const code = `BATTLE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const room = await prisma.room.create({
            data: {
                code,
                status: 'WAITING',
                maxPlayers: 2,
                players: {
                    create: { userId, score: 0, isReady: false },
                },
            },
        });
        res.status(201).json({ success: true, data: { room, inviteCode: code } });
    }
    catch (error) {
        console.error('[Friends] Create battle room error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ─── HELPER ───────────────────────────────────────────────────────────────────
async function getAcceptedFriendIds(userId) {
    const friendships = await prisma.friendship.findMany({
        where: {
            status: 'ACCEPTED',
            OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { senderId: true, receiverId: true },
    });
    return friendships.map((f) => (f.senderId === userId ? f.receiverId : f.senderId));
}
export default router;
//# sourceMappingURL=friends.js.map