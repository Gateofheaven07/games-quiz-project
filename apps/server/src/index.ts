import express, { Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
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

// 1. Initialize DB with a Singleton Promise
let dbInitPromise: Promise<void> | null = null;

const ensureDbConnected = async () => {
  if (!dbInitPromise) {
    dbInitPromise = initialize().catch((err) => {
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
};

// 2. Strict CORS Configuration (Whitelist Mode)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Add default local origins for development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const sanitizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(sanitizedOrigin)) {
      callback(null, true);
    } else {
      console.error(`[CORS] Rejected Origin: ${origin}. Whitelist:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

// 3. Socket.IO Optimization (Prioritizing WebSocket for Cloudflare Tunnel)
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
  transports: ['websocket'], // Force WebSocket to avoid Cloudflare HTTP long-polling overhead
  pingInterval: 25000,       // Keep-alive for Cloudflare idle timeout
  pingTimeout: 60000,        // Allow more time for client response
});

setupSocketHandlers(io);

// 4. Standard Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. DB Initialization Middleware
app.use(async (req, res, next) => {
  try {
    await ensureDbConnected();
    next();
  } catch (err) {
    console.error('[Server] DB Initialization failed:', err);
    res.status(500).json({ 
      error: 'Database connection error'
    });
  }
});

// Routes
app.get('/', (_req, res) => {
  res.json({ 
    status: 'Quiz Battle Server is running', 
    mode: 'Persistent (Cloudflare Tunnel Ready)',
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);

// Start Server
const PORT = process.env.PORT || 3001;
ensureDbConnected().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[Server] Persistent server running on port ${PORT}`);
    console.log(`[CORS] Whitelisted origins:`, allowedOrigins);
  });
});

export default app;

