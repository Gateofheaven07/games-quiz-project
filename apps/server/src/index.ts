import express, { Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initialize } from './lib/db';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import quizRoutes from './routes/quiz';
import leaderboardRoutes from './routes/leaderboard';
import friendsRoutes from './routes/friends';
import { setupSocketHandlers } from './lib/socketHandlers';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Initialize and start server
async function start() {
  try {
    // Initialize database connection
    await initialize();
    console.log('[Server] Database initialized');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT} in ${NODE_ENV} mode`);
      console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
