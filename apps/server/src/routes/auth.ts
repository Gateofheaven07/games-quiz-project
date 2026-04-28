import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, generateTokens, verifyRefreshToken } from '../lib/auth';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      res.status(409).json({ success: false, error: 'Username or email already exists' });
      return;
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: passwordHash,
        level: 0,
        totalScore: 0,
        wins: 0,
        losses: 0
      }
    });

    const tokens = generateTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('[Auth Routes] Register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('[Auth Routes] Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token is required' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const tokens = generateTokens({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('[Auth Routes] Refresh error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get current user (validate token)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, username: true, email: true, level: true, createdAt: true }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          level: user.level,
          createdAt: user.createdAt,
        }
      }
    });
  } catch (error) {
    console.error('[Auth Routes] Me error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
