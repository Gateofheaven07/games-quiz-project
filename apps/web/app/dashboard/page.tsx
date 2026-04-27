'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Zap, Trophy, BarChart3, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [stats, setStats] = useState({ gamesPlayed: 0, totalScore: 0, averageScore: 0 });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-cyan-400">QuizBattle</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-300">Welcome, <span className="text-cyan-400 font-semibold">{user.username}</span></span>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-400 border-red-400 hover:bg-red-400/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Games Played</p>
                <p className="text-3xl font-bold text-white">{stats.gamesPlayed}</p>
              </div>
              <Zap className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Score</p>
                <p className="text-3xl font-bold text-white">{stats.totalScore}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Average Score</p>
                <p className="text-3xl font-bold text-white">{stats.averageScore.toFixed(0)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Game Options */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">Start Playing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Easy Game */}
            <Link href="/game?difficulty=easy">
              <div className="bg-slate-700/50 hover:bg-slate-700 rounded-lg p-6 cursor-pointer transition-colors border border-slate-600">
                <div className="text-4xl mb-4">😊</div>
                <h3 className="text-xl font-bold text-white mb-2">Easy</h3>
                <p className="text-slate-400 text-sm mb-4">Get started with basic questions</p>
                <div className="inline-block px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded text-sm font-medium">
                  Play Now
                </div>
              </div>
            </Link>

            {/* Medium Game */}
            <Link href="/game?difficulty=medium">
              <div className="bg-slate-700/50 hover:bg-slate-700 rounded-lg p-6 cursor-pointer transition-colors border border-slate-600">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-white mb-2">Medium</h3>
                <p className="text-slate-400 text-sm mb-4">Challenge yourself with tougher questions</p>
                <div className="inline-block px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded text-sm font-medium">
                  Play Now
                </div>
              </div>
            </Link>

            {/* Hard Game */}
            <Link href="/game?difficulty=hard">
              <div className="bg-slate-700/50 hover:bg-slate-700 rounded-lg p-6 cursor-pointer transition-colors border border-slate-600">
                <div className="text-4xl mb-4">🔥</div>
                <h3 className="text-xl font-bold text-white mb-2">Hard</h3>
                <p className="text-slate-400 text-sm mb-4">Test your skills with expert questions</p>
                <div className="inline-block px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded text-sm font-medium">
                  Play Now
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Link href="/leaderboard">
            <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-6 text-lg">
              <Trophy className="w-5 h-5 mr-2" />
              View Leaderboard
            </Button>
          </Link>
          <Link href="/profile">
            <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-6 text-lg">
              <BarChart3 className="w-5 h-5 mr-2" />
              View Profile
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
