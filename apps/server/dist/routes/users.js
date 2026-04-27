import { Router } from 'express';
import { query } from '../lib/db';
import { authMiddleware } from '../middleware/auth';
const router = Router();
// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const result = await query('SELECT id, username, email, created_at FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const user = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            email: result.rows[0].email,
            createdAt: result.rows[0].created_at,
        };
        res.json({ success: true, data: user });
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
        const result = await query('SELECT id, username, email, created_at FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const user = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            email: result.rows[0].email,
            createdAt: result.rows[0].created_at,
        };
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error('[User Routes] Error getting user:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
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
        const result = await query('UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, created_at', [email, req.user.userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const user = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            email: result.rows[0].email,
            createdAt: result.rows[0].created_at,
        };
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error('[User Routes] Error updating profile:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=users.js.map