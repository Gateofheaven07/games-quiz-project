'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { userApi, quizApi, leaderboardApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { ArrowLeft, LogOut, BarChart3, Zap } from 'lucide-react';

interface UserStats {
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  perfectGames: number;
  rank: number;
}

interface GameResult {
  id: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  difficulty: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, getAuthClient } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const client = getAuthClient();

        // Fetch user rank
        const rankResponse = await leaderboardApi.getUserRank(user.id);
        const rank = rankResponse.data.data.rank;

        // Fetch game history
        const historyResponse = await quizApi.getHistory(client, 10, 0);
        const data = historyResponse.data.data;

        setStats({
          gamesPlayed: data.total,
          totalScore: data.results.reduce((sum: number, r: any) => sum + r.score, 0),
          averageScore: data.results.length > 0
            ? data.results.reduce((sum: number, r: any) => sum + r.score, 0) / data.results.length
            : 0,
          perfectGames: data.results.filter((r: any) => r.correctAnswers === r.totalQuestions).length,
          rank,
        });

        setHistory(data.results);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated, user, getAuthClient]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-cyan-400">My Profile</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-red-400 border-red-400 hover:bg-red-400/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Profile Info */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-cyan-400 rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">{user.username.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{user.username}</h2>
            <p className="text-slate-400">{user.email}</p>
            {stats && <p className="text-cyan-400 font-semibold mt-2">Rank #{stats.rank}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Games Played</p>
              <p className="text-3xl font-bold text-white">{stats.gamesPlayed}</p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Total Score</p>
              <p className="text-3xl font-bold text-cyan-400">{stats.totalScore}</p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Average Score</p>
              <p className="text-3xl font-bold text-purple-400">{stats.averageScore.toFixed(1)}</p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Perfect Games</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.perfectGames}</p>
            </div>
          </div>
        )}

        {/* Recent Games */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6">Recent Games</h3>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-2"></div>
              <p className="text-slate-400">Loading...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400">No games played yet. Start playing to see your history!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">Score: {game.score}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        game.difficulty === 'easy'
                          ? 'bg-green-600/30 text-green-300'
                          : game.difficulty === 'medium'
                          ? 'bg-yellow-600/30 text-yellow-300'
                          : 'bg-red-600/30 text-red-300'
                      }`}>
                        {game.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      {game.correctAnswers}/{game.totalQuestions} correct
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
