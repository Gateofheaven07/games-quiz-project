import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get unread count
router.get('/unread', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const count = await prisma.notification.count({
      where: {
        receiverId: userId,
        status: 'UNREAD'
      }
    });
    res.json({ data: { count } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Get all notifications
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true }
        },
        message: true,
        room: true
      }
    });
    res.json({ data: { notifications } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark as read
router.post('/read', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { notificationIds } = req.body;
    
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        receiverId: userId
      },
      data: {
        status: 'READ'
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

export default router;
