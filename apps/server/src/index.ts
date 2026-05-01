import express, { Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { initialize } from './lib/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import quizRoutes from './routes/quiz.js';
import leaderboardRoutes from './routes/leaderboard.js';
import friendsRoutes from './routes/friends.js';
import { setupSocketHandlers } from './lib/socketHandlers.js';

dotenv.config();

const app: Express = express();

// 1. Initialize DB with a Singleton Promise to prevent race conditions in Serverless
let dbInitPromise: Promise<void> | null = null;

const ensureDbConnected = async () => {
  if (!dbInitPromise) {
    dbInitPromise = initialize().catch((err) => {
      dbInitPromise = null; // Reset on failure so next request can retry
      throw err;
    });
  }
  return dbInitPromise;
};

// 2. Conditional Socket.IO (Disabled on Vercel)
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
let io: SocketIOServer | null = null;

if (!isVercel) {
  // Only create httpServer and io if NOT on Vercel
  const httpServer = createServer(app);
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
  });
  setupSocketHandlers(io);

  const PORT = process.env.PORT || 3001;
  ensureDbConnected().then(() => {
    httpServer.listen(PORT, () => {
      console.log(`[Server] Local dev server running on http://localhost:${PORT}`);
    });
  });
}

// 3. Standard Middleware
app.use(cors({
  origin: process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. DB Initialization Middleware (Race-condition safe)
app.use(async (req, res, next) => {
  try {
    await ensureDbConnected();
    next();
  } catch (err) {
    console.error('[Server] DB Initialization failed during request:', err);
    res.status(500).json({ 
      error: 'Database connection error',
      message: process.env.NODE_ENV === 'development' ? String(err) : undefined 
    });
  }
});

// Root route
app.get('/', (_req, res) => {
  res.json({ 
    status: 'Server is running', 
    mode: isVercel ? 'Serverless (Vercel)' : 'Persistent (Local)',
    timestamp: new Date().toISOString() 
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);

// Export for Vercel
export default app;
// Export handler for serverless-http compatibility if needed
export const handler = serverless(app);
