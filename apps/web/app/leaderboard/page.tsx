'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { leaderboardApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Trophy, Zap } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  perfectGames: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('allTime');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const response = await leaderboardApi.getGlobal(50, 0, timeframe);
        setLeaderboard(response.data.data.leaderboard);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isAuthenticated, timeframe]);

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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-cyan-400">Global Leaderboard</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { label: 'All Time', value: 'allTime' },
            { label: 'This Month', value: 'month' },
            { label: 'This Week', value: 'week' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTimeframe(tab.value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                timeframe === tab.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-slate-300">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <Trophy className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400">No players yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Rank</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Player</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Games</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Total Score</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Average</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-300">Perfect</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.userId}
                      className={`border-b border-slate-700 ${
                        index % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800'
                      } hover:bg-slate-700/50 transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {entry.rank === 1 && <Trophy className="w-5 h-5 text-yellow-400" />}
                          {entry.rank === 2 && <Trophy className="w-5 h-5 text-slate-400" />}
                          {entry.rank === 3 && <Trophy className="w-5 h-5 text-orange-600" />}
                          <span className="text-white font-bold">{entry.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{entry.username}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-slate-300">{entry.gamesPlayed}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-cyan-400 font-semibold">{entry.totalScore}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-purple-400 font-semibold">{entry.averageScore.toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-yellow-400 font-semibold">{entry.perfectGames}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
