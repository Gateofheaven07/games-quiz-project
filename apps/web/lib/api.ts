import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const createApiClient = (token?: string): AxiosInstance => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
};

export const apiClient = createApiClient();

// Auth endpoints
export const authApi = {
  register: (username: string, email: string, password: string) =>
    apiClient.post('/auth/register', { username, email, password }),
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
};

// User endpoints
export const userApi = {
  getProfile: (client: AxiosInstance) =>
    client.get('/users/profile'),
  getByUsername: (username: string) =>
    apiClient.get(`/users/${username}`),
  updateProfile: (client: AxiosInstance, email: string) =>
    client.put('/users/profile', { email }),
};

// Quiz endpoints
export const quizApi = {
  getQuestions: (difficulty: string = 'medium', limit: number = 10) =>
    apiClient.get('/quiz/questions', { params: { difficulty, limit } }),
  getQuestionsByCategory: (category: string, limit: number = 10) =>
    apiClient.get(`/quiz/questions/category/${category}`, { params: { limit } }),
  saveResult: (client: AxiosInstance, data: {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    duration: number;
    difficulty: string;
    opponentId?: string;
  }) =>
    client.post('/quiz/results', data),
  getHistory: (client: AxiosInstance, limit: number = 20, offset: number = 0) =>
    client.get('/quiz/history', { params: { limit, offset } }),
};

// Leaderboard endpoints
export const leaderboardApi = {
  getGlobal: (limit: number = 50, offset: number = 0, timeframe: string = 'allTime') =>
    apiClient.get('/leaderboard', { params: { limit, offset, timeframe } }),
  getUserRank: (userId: string) =>
    apiClient.get(`/leaderboard/rank/${userId}`),
};
