// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  level?: number;
  totalScore?: number;
  wins?: number;
  losses?: number;
}

// Authentication
export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

// Quiz & Game
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameResult {
  id: string;
  userId: string;
  opponentId?: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  duration: number; // in seconds
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
}

export interface GameRoom {
  id: string;
  player1: string;
  player2?: string;
  status: 'waiting' | 'active' | 'finished';
  questions: Question[];
  currentQuestionIndex: number;
  player1Answers: number[];
  player2Answers: number[];
  createdAt: Date;
}

// Socket Events
export interface SocketEvents {
  // Client to Server
  'user:join_room': (data: { roomId: string }) => void;
  'user:create_room': (data: { difficulty: string }) => void;
  'game:submit_answer': (data: { answer: number; questionIndex: number }) => void;
  'game:next_question': () => void;
  'game:finish': () => void;

  // Server to Client
  'room:joined': (data: { roomId: string; players: string[] }) => void;
  'room:ready': (data: { roomId: string; questions: Question[] }) => void;
  'game:question': (data: { question: Question; index: number; total: number }) => void;
  'game:answer_received': (data: { playerIndex: number }) => void;
  'game:finished': (data: { result: GameResult; opponentResult?: GameResult }) => void;
  'game:opponent_finished': (data: { result: GameResult }) => void;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
