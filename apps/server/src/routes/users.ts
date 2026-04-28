import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { UserPublic } from '@quiz-battle/shared';

const router = Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, username: true, email: true, createdAt: true, level: true, totalScore: true, wins: true, losses: true }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userPublic: UserPublic = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      level: user.level,
      totalScore: user.totalScore,
      wins: user.wins,
      losses: user.losses,
    } as UserPublic;

    res.json({ success: true, data: userPublic });
  } catch (error) {
    console.error('[User Routes] Error getting profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user by username
router.get('/:username', async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, createdAt: true, level: true, totalScore: true, wins: true, losses: true }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userPublic: UserPublic = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      level: user.level,
      totalScore: user.totalScore,
      wins: user.wins,
      losses: user.losses,
    } as UserPublic;

    res.json({ success: true, data: userPublic });
  } catch (error) {
    console.error('[User Routes] Error getting user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid email' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { email },
      select: { id: true, username: true, email: true, createdAt: true, level: true, totalScore: true, wins: true, losses: true }
    });

    const userPublic: UserPublic = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      level: user.level,
      totalScore: user.totalScore,
      wins: user.wins,
      losses: user.losses,
    } as UserPublic;

    res.json({ success: true, data: userPublic });
  } catch (error) {
    console.error('[User Routes] Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
