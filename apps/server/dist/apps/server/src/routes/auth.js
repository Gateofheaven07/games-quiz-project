import { Router } from 'express';
import { query } from '../lib/db';
import { hashPassword, verifyPassword, generateTokens, verifyRefreshToken } from '../lib/auth';
const router = Router();
// Register
router.post('/register', async (req, res) => {
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
        const checkResult = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (checkResult.rows.length > 0) {
            res.status(409).json({ success: false, error: 'Username or email already exists' });
            return;
        }
        // Hash password and create user
        const passwordHash = await hashPassword(password);
        const result = await query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email', [username, email, passwordHash]);
        const user = result.rows[0];
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
    }
    catch (error) {
        console.error('[Auth Routes] Register error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            res.status(400).json({ success: false, error: 'Email and password are required' });
            return;
        }
        // Find user
        const result = await query('SELECT id, username, email, password_hash FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        const user = result.rows[0];
        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);
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
    }
    catch (error) {
        console.error('[Auth Routes] Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// Refresh token
router.post('/refresh', async (req, res) => {
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
        const result = await query('SELECT id, username, email FROM users WHERE id = $1', [payload.userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const user = result.rows[0];
        const tokens = generateTokens({
            userId: user.id,
            username: user.username,
            email: user.email,
        });
        res.json({
            success: true,
            data: tokens,
        });
    }
    catch (error) {
        console.error('[Auth Routes] Refresh error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=auth.js.map