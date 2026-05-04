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
import notificationRoutes from './routes/notifications.js';
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

// 2. Centralized CORS Configuration
const getAllowedOrigins = () => {
  const defaults = ['http://localhost:3000', 'https://games-quiz-project-web.vercel.app'];
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  
  // Merge and deduplicate
  return Array.from(new Set([...defaults, ...fromEnv]));
};

const allowedOrigins = getAllowedOrigins();

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // 1. Allow internal requests (no origin)
    if (!origin) return callback(null, true);

    // 2. Sanitize and Check Whitelist
    const sanitizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(sanitizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Access Denied for: ${origin}`);
      callback(new Error('Blocked by CORS Policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200, // Legacy browser support
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// 3. Socket.IO — Support polling + WebSocket (wajib untuk Cloudflare Tunnel)
// Cloudflare Tunnel membutuhkan HTTP polling handshake sebelum upgrade ke WebSocket.
// Jika server hanya menerima 'websocket', client yang coba polling akan gagal 400.
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
  transports: ['polling', 'websocket'], // ✅ Mirror dengan konfigurasi client
  pingInterval: 25000,                   // Keep-alive untuk Cloudflare idle timeout
  pingTimeout:  60000,                   // Beri waktu lebih untuk client response
  allowEIO3:    true,                    // Kompatibilitas dengan Socket.IO v3 client
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
app.use('/api/notifications', notificationRoutes);

// Start Server
const PORT = process.env.PORT || 3001;
ensureDbConnected().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[Server] Persistent server running on port ${PORT}`);
    console.log(`[CORS] Whitelisted origins:`, allowedOrigins);
  });
});

export default app;

