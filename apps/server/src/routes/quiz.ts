import { Router, Request, Response } from 'express';
import { query } from '../lib/db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { GameResult } from '@quiz-battle/shared';

const router = Router();

// Get random questions by difficulty
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const { difficulty = 'medium', limit = 10 } = req.query;
    const numLimit = Math.min(parseInt(limit as string) || 10, 20);

    const result = await query(
      `SELECT id, text, options, correct_answer, category, difficulty 
       FROM questions 
       WHERE difficulty = $1 
       ORDER BY RANDOM() 
       LIMIT $2`,
      [difficulty as string, numLimit]
    );

    const questions = result.rows.map((row: any) => ({
      id: row.id,
      text: row.text,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      correctAnswer: row.correct_answer,
      category: row.category,
      difficulty: row.difficulty,
    }));

    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('[Quiz Routes] Error getting questions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get questions by category
router.get('/questions/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    const numLimit = Math.min(parseInt(limit as string) || 10, 20);

    const result = await query(
      `SELECT id, text, options, correct_answer, category, difficulty 
       FROM questions 
       WHERE LOWER(category) = LOWER($1)
       ORDER BY RANDOM() 
       LIMIT $2`,
      [category, numLimit]
    );

    const questions = result.rows.map((row: any) => ({
      id: row.id,
      text: row.text,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      correctAnswer: row.correct_answer,
      category: row.category,
      difficulty: row.difficulty,
    }));

    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('[Quiz Routes] Error getting category questions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Save game result
router.post('/results', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { score, correctAnswers, totalQuestions, duration, difficulty, opponentId } = req.body;

    if (typeof score !== 'number' || typeof duration !== 'number') {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }

    const result = await query(
      `INSERT INTO game_results 
       (user_id, opponent_id, score, correct_answers, total_questions, duration, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, opponent_id, score, correct_answers, total_questions, duration, difficulty, created_at`,
      [req.user.userId, opponentId || null, score, correctAnswers, totalQuestions, duration, difficulty || 'medium']
    );

    const gameResult: GameResult = {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      opponentId: result.rows[0].opponent_id,
      score: result.rows[0].score,
      correctAnswers: result.rows[0].correct_answers,
      totalQuestions: result.rows[0].total_questions,
      duration: result.rows[0].duration,
      difficulty: result.rows[0].difficulty,
      createdAt: result.rows[0].created_at,
    };

    res.status(201).json({ success: true, data: gameResult });
  } catch (error) {
    console.error('[Quiz Routes] Error saving result:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user's game history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { limit = 20, offset = 0 } = req.query;
    const numLimit = Math.min(parseInt(limit as string) || 20, 100);
    const numOffset = Math.max(parseInt(offset as string) || 0, 0);

    const result = await query(
      `SELECT id, user_id, opponent_id, score, correct_answers, total_questions, duration, difficulty, created_at
       FROM game_results 
       WHERE user_id = $1 
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, numLimit, numOffset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as count FROM game_results WHERE user_id = $1',
      [req.user.userId]
    );

    const gameResults: GameResult[] = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      opponentId: row.opponent_id,
      score: row.score,
      correctAnswers: row.correct_answers,
      totalQuestions: row.total_questions,
      duration: row.duration,
      difficulty: row.difficulty,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: {
        results: gameResults,
        total: parseInt(countResult.rows[0].count),
        page: Math.floor(numOffset / numLimit) + 1,
        limit: numLimit,
      },
    });
  } catch (error) {
    console.error('[Quiz Routes] Error getting history:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
