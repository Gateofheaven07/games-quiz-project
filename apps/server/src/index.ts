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
const httpServer = createServer(app);

// NOTE: Socket.io will NOT work on Vercel Serverless Functions.
// It requires a persistent server or a dedicated WebSocket provider.
// This setup is kept for local development compatibility.
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to ensure DB is initialized (crucial for Serverless)
let isInitialized = false;
app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      await initialize();
      isInitialized = true;
    } catch (err) {
      console.error('[Server] DB Initialization failed:', err);
      return res.status(500).json({ error: 'Database initialization failed' });
    }
  }
  next();
});

// Root route — confirms server is alive
app.get('/', (_req, res) => {
  res.json({ 
    status: 'Server is running', 
    message: 'WebSocket available at /socket.io/ (Local only)', 
    environment: NODE_ENV,
    timestamp: new Date().toISOString() 
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);

// Setup Socket.IO handlers (Works locally, not on Vercel)
setupSocketHandlers(io);

// Wrap app for serverless as requested
const handler = serverless(app);

// Start listener only if not running on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  initialize().then(() => {
    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT} in ${NODE_ENV} mode`);
      console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('[Server] Failed to start:', err);
  });
}

// Export the app (for Vercel's default Express support)
export default app;

// Export the serverless handler (as requested)
export { handler };
