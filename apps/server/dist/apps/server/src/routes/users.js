import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../lib/auth.js';
const router = Router();
// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, username: true, email: true, createdAt: true, level: true, totalScore: true, wins: true, losses: true, avatar: true }
        });
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const userPublic = {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            level: user.level,
            totalScore: user.totalScore,
            wins: user.wins,
            losses: user.losses,
            avatar: user.avatar,
        };
        res.json({ success: true, data: userPublic });
    }
    catch (error) {
        console.error('[User Routes] Error getting profile:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// Get user by username
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true, email: true, createdAt: true, level: true, totalScore: true, wins: true, losses: true, avatar: true }
        });
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const userPublic = {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            level: user.level,
            totalScore: user.totalScore,
            wins: user.wins,
            losses: user.losses,
            avatar: user.avatar,
        };
        res.json({ success: true, data: userPublic });
    }
    catch (error) {
        console.error('[User Routes] Error getting user:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// Update user profile (username, email, avatar, password)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const { username, email, avatar, currentPassword, newPassword } = req.body;
        // Build update data
        const updateData = {};
        if (email && typeof email === 'string') {
            // Check email not taken by another user
            const existing = await prisma.user.findFirst({ where: { email, NOT: { id: req.user.userId } } });
            if (existing) {
                res.status(409).json({ success: false, error: 'Email already in use' });
                return;
            }
            updateData.email = email;
        }
        if (username && typeof username === 'string') {
            // Check username not taken by another user
            const existing = await prisma.user.findFirst({ where: { username, NOT: { id: req.user.userId } } });
            if (existing) {
                res.status(409).json({ success: false, error: 'Username already taken' });
                return;
            }
            updateData.username = username;
        }
        if (avatar !== undefined) {
            updateData.avatar = avatar || null;
        }
        // Password change
        if (newPassword) {
            if (!currentPassword) {
                res.status(400).json({ success: false, error: 'Current password is required to change password' });
                return;
            }
            if (newPassword.length < 6) {
                res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
                return;
            }
            const userRecord = await prisma.user.findUnique({ where: { id: req.user.userId } });
            if (!userRecord) {
                res.status(404).json({ success: false, error: 'User not found' });
                return;
            }
            const isValid = await verifyPassword(currentPassword, userRecord.password);
            if (!isValid) {
                res.status(401).json({ success: false, error: 'Current password is incorrect' });
                return;
            }
            updateData.password = await hashPassword(newPassword);
        }
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ success: false, error: 'No fields to update' });
            return;
        }
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: updateData,
            select: { id: true, username: true, email: true, createdAt: true, level: true, totalScore: true, wins: true, losses: true, avatar: true }
        });
        const userPublic = {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            level: user.level,
            totalScore: user.totalScore,
            wins: user.wins,
            losses: user.losses,
            avatar: user.avatar,
        };
        res.json({ success: true, data: userPublic });
    }
    catch (error) {
        console.error('[User Routes] Error updating profile:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=users.js.map