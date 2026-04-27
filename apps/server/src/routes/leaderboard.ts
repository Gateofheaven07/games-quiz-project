import { Router, Request, Response } from 'express';
import { query } from '../lib/db';

const router = Router();

// Get global leaderboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, timeframe = 'allTime' } = req.query;
    const numLimit = Math.min(parseInt(limit as string) || 50, 100);
    const numOffset = Math.max(parseInt(offset as string) || 0, 0);

    let dateFilter = '';
    if (timeframe === 'week') {
      dateFilter = 'AND gr.created_at >= NOW() - INTERVAL \'7 days\'';
    } else if (timeframe === 'month') {
      dateFilter = 'AND gr.created_at >= NOW() - INTERVAL \'30 days\'';
    }

    const result = await query(
      `SELECT 
        u.id, 
        u.username, 
        COUNT(gr.id) as games_played,
        SUM(gr.score) as total_score,
        AVG(gr.score) as avg_score,
        SUM(CASE WHEN gr.correct_answers = gr.total_questions THEN 1 ELSE 0 END) as perfect_games
       FROM users u
       LEFT JOIN game_results gr ON u.id = gr.user_id ${dateFilter}
       GROUP BY u.id, u.username
       HAVING COUNT(gr.id) > 0
       ORDER BY total_score DESC
       LIMIT $1 OFFSET $2`,
      [numLimit, numOffset]
    );

    const countResult = await query(
      `SELECT COUNT(DISTINCT u.id) as count 
       FROM users u 
       LEFT JOIN game_results gr ON u.id = gr.user_id ${dateFilter}
       WHERE COUNT(gr.id) > 0`,
      []
    );

    const leaderboard = result.rows.map((row: any, rank: number) => ({
      rank: numOffset + rank + 1,
      userId: row.id,
      username: row.username,
      gamesPlayed: parseInt(row.games_played),
      totalScore: parseInt(row.total_score) || 0,
      averageScore: parseFloat(row.avg_score) || 0,
      perfectGames: parseInt(row.perfect_games) || 0,
    }));

    res.json({
      success: true,
      data: {
        leaderboard,
        total: parseInt(countResult.rows[0]?.count) || 0,
        page: Math.floor(numOffset / numLimit) + 1,
        limit: numLimit,
        timeframe,
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

    const result = await query(
      `SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(gr.score) DESC) as rank,
        u.username,
        COUNT(gr.id) as games_played,
        SUM(gr.score) as total_score,
        AVG(gr.score) as avg_score
       FROM users u
       LEFT JOIN game_results gr ON u.id = gr.user_id
       WHERE u.id = $1
       GROUP BY u.id, u.username`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const row = result.rows[0];
    const userRank = {
      rank: row.rank,
      username: row.username,
      gamesPlayed: parseInt(row.games_played) || 0,
      totalScore: parseInt(row.total_score) || 0,
      averageScore: parseFloat(row.avg_score) || 0,
    };

    res.json({ success: true, data: userRank });
  } catch (error) {
    console.error('[Leaderboard Routes] Error getting user rank:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
