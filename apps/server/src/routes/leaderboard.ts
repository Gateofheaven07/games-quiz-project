import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Helper to compute stats
const computeUserStats = (user: any) => {
  const gamesPlayed = user.gameResults.length;
  const totalScore = user.gameResults.reduce((sum: number, gr: any) => sum + gr.score, 0);
  const averageScore = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;
  // Fallback to user's stored totalScore if gameResults are missing, but let's just use what's there
  const perfectGames = 0; // Not available in Prisma schema
  
  return {
    userId: user.id,
    username: user.username,
    gamesPlayed,
    totalScore: totalScore || user.totalScore || 0,
    averageScore,
    perfectGames
  };
};

// Get global leaderboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const numLimit = Math.min(parseInt(limit as string) || 50, 100);
    const numOffset = Math.max(parseInt(offset as string) || 0, 0);

    const users = await prisma.user.findMany({
      include: {
        gameResults: true
      }
    });

    let leaderboard = users.map(computeUserStats);
    
    // Sort by total score descending
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    // Add rank
    leaderboard = leaderboard.map((stat, index) => ({
      ...stat,
      rank: index + 1
    }));

    const total = leaderboard.length;
    const paginatedLeaderboard = leaderboard.slice(numOffset, numOffset + numLimit);

    res.json({
      success: true,
      data: {
        leaderboard: paginatedLeaderboard,
        total,
        page: Math.floor(numOffset / numLimit) + 1,
        limit: numLimit,
        timeframe: req.query.timeframe || 'allTime',
      },
    });
  } catch (error) {
    console.error('[Leaderboard Routes] Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user rank
router.get('/rank/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const users = await prisma.user.findMany({
      include: {
        gameResults: true
      }
    });

    let leaderboard = users.map(computeUserStats);
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    const userIndex = leaderboard.findIndex(u => u.userId === userId);

    if (userIndex === -1) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userStat = leaderboard[userIndex];

    const userRank = {
      rank: userIndex + 1,
      username: userStat.username,
      gamesPlayed: userStat.gamesPlayed,
      totalScore: userStat.totalScore,
      averageScore: userStat.averageScore,
    };

    res.json({ success: true, data: userRank });
  } catch (error) {
    console.error('[Leaderboard Routes] Error getting user rank:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
