'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { AppSidebar, AppMobileNav } from '../../components/AppSidebar';
interface UserStats {
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  perfectGames: number;
  rank: number | null;
}

interface GameHistoryItem {
  id: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  duration: number;
  difficulty: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, getAuthClient, logout, token } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Fetch user data
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !token) return;

    const fetchUserData = async () => {
      setIsLoading(true);
      setDataError(null);

      try {
        const client = getAuthClient();

        // Fetch rank (doesn't need auth, just userId)
        let rank: number | null = null;
        try {
          const rankResponse = await client.get(`/leaderboard/rank/${user.id}`);
          rank = rankResponse.data?.data?.rank ?? null;
        } catch {
          // Rank fetch failed — non-critical, continue
          rank = null;
        }

        // Fetch game history (needs auth token)
        let historyData: GameHistoryItem[] = [];
        let totalGames = 0;
        try {
          const historyResponse = await client.get('/quiz/history', {
            params: { limit: 10, offset: 0 },
          });
          const data = historyResponse.data?.data;
          if (data) {
            historyData = data.results || [];
            totalGames = data.total || 0;
          }
        } catch {
          // History fetch failed — non-critical, show empty
          historyData = [];
          totalGames = 0;
        }

        const totalScore = historyData.reduce((sum, r) => sum + r.score, 0);
        const avgScore = historyData.length > 0 ? totalScore / historyData.length : 0;
        const perfectGames = historyData.filter(
          (r) => r.correctAnswers === r.totalQuestions
        ).length;

        setStats({
          gamesPlayed: totalGames,
          totalScore,
          averageScore: Math.round(avgScore),
          perfectGames,
          rank,
        });
        setHistory(historyData);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setDataError('Gagal memuat data profil. Silakan coba lagi.');
        setStats({ gamesPlayed: 0, totalScore: 0, averageScore: 0, perfectGames: 0, rank: null });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated, user, authLoading, token, getAuthClient]);

  // While auth is loading, show spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e14]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#00d1ff] mx-auto mb-4"></div>
          <p className="text-[#bbc9cf] font-bold tracking-widest text-xs uppercase">Memuat...</p>
        </div>
      </div>
    );
  }

  // If not authenticated (after loading), don't render (redirect handled by useEffect)
  if (!isAuthenticated || !user) return null;

  return (
    <div className="font-body-md text-on-background selection:bg-primary-container selection:text-on-primary-container bg-[#0b0e14] text-[#dde3e7] min-h-screen">

      {/* Top Navigation & Sidebar */}
      <AppMobileNav active="Profil" />
      <div className="flex flex-col lg:flex-row flex-1 w-full">
        <AppSidebar active="Profil" />

      {/* Main Content */}
      <main className="lg:ml-72 pt-8 lg:pt-24 px-6 pb-12 min-h-screen flex-1">
        <div className="max-w-6xl mx-auto">

          {/* Error Banner */}
          {dataError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {dataError}
            </div>
          )}

          {/* Profile Header */}
          <header className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
            <div className="md:col-span-8 glass-card rounded-2xl p-6 sm:p-10 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 sm:gap-10 shadow-2xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-cyan-500/10 via-transparent to-transparent pointer-events-none"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>
              
              <div className="relative group shrink-0">
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl group-hover:bg-cyan-400/30 transition-all duration-500"></div>
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[3px] border-cyan-400/80 p-1 object-cover bg-slate-900 relative z-10 shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[3px] border-cyan-400/80 p-1 bg-slate-900 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-transform duration-300 group-hover:scale-105">
                    <span className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-cyan-600">
                      {user?.username?.charAt(0).toUpperCase() || 'O'}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-black border-2 border-slate-900 shadow-lg z-20 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">military_tech</span>
                  LVL {user?.level || 0}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left z-10 w-full">
                <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 mb-2">
                  <div className="flex flex-col items-center md:items-start">
                    <p className="text-cyan-400 font-bold text-[10px] sm:text-xs tracking-[0.25em] mb-2 uppercase bg-cyan-400/10 px-2 py-1 rounded text-center md:text-left inline-block">
                      Pemain Utama
                    </p>
                    <h1 className="font-['Space_Grotesk'] text-white uppercase text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-md">
                      {user?.username || 'OPERATOR'}
                    </h1>
                  </div>
                  <Link href="/profile/settings" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest backdrop-blur-md shrink-0">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit Profil
                  </Link>
                </div>
                
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>
                
                <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
                  <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 px-3 py-3 sm:p-4 rounded-xl flex flex-col items-center md:items-start hover:border-cyan-500/30 transition-colors group">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 group-hover:text-cyan-300 transition-colors">Peringkat</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs sm:text-sm text-cyan-500 font-bold">#</span>
                      <p className="text-xl sm:text-2xl font-black text-white">{stats?.rank ?? '-'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 px-3 py-3 sm:p-4 rounded-xl flex flex-col items-center md:items-start hover:border-cyan-500/30 transition-colors group">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 group-hover:text-cyan-300 transition-colors">Skor</p>
                    <div className="flex items-baseline gap-1">
                      <span className="material-symbols-outlined text-[14px] text-purple-400">local_fire_department</span>
                      <p className="text-xl sm:text-2xl font-black text-white">{isLoading ? '...' : (stats?.totalScore ?? 0)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 px-3 py-3 sm:p-4 rounded-xl flex flex-col items-center md:items-start hover:border-cyan-500/30 transition-colors group">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 group-hover:text-cyan-300 transition-colors">Main</p>
                    <div className="flex items-baseline gap-1">
                      <span className="material-symbols-outlined text-[14px] text-blue-400">sports_esports</span>
                      <p className="text-xl sm:text-2xl font-black text-white">{isLoading ? '...' : (stats?.gamesPlayed ?? 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 glass-card rounded-xl p-6 flex flex-col justify-between border-primary/20">
              <div>
                <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">STATISTIK</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-slate-400 text-xs uppercase font-bold">Rata-rata Skor</span>
                    <span className="text-white font-bold">{isLoading ? '...' : (stats?.averageScore ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-slate-400 text-xs uppercase font-bold">Game Sempurna</span>
                    <span className="text-cyan-400 font-bold">{isLoading ? '...' : (stats?.perfectGames ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs uppercase font-bold">Email</span>
                    <span className="text-white text-xs truncate max-w-[120px]">{user.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Game History */}
          <div className="glass-card rounded-xl p-6 mb-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">history</span>
                Riwayat Pertandingan
              </h3>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00d1ff] mx-auto mb-2"></div>
                <p className="text-xs">Memuat riwayat...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-3 block">sports_esports</span>
                <p className="font-bold text-sm uppercase tracking-widest">Belum Ada Pertandingan</p>
                <p className="text-xs mt-2">Mulai bermain untuk melihat riwayat pertandingan Anda</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-block px-6 py-2 rounded-lg bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] text-[#0e1417] font-bold text-xs tracking-widest uppercase"
                >
                  Mulai Bermain
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => {
                  const isPerfect = item.correctAnswers === item.totalQuestions;
                  const accuracy = item.totalQuestions > 0
                    ? Math.round((item.correctAnswers / item.totalQuestions) * 100)
                    : 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-cyan-400/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded flex items-center justify-center border ${isPerfect ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-slate-800 border-white/10'}`}>
                          <span className={`material-symbols-outlined ${isPerfect ? 'text-yellow-400' : 'text-slate-500'}`}
                            style={{ fontVariationSettings: "'FILL' 1" }}>
                            {isPerfect ? 'emoji_events' : 'sports_esports'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-cyan-400 transition-colors capitalize">
                            {item.difficulty} Quiz
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase">
                            {item.correctAnswers}/{item.totalQuestions} benar • {accuracy}% akurasi • {Math.round(item.duration / 60)}m
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-cyan-400 text-sm">+{item.score} pts</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Achievements */}
          <section className="glass-card rounded-xl p-8">
            <h3 className="text-white text-lg font-bold mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-400">military_tech</span>
              Aula Kehormatan
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
              {[
                { icon: 'bolt', label: 'Jari Tercepat', color: 'from-cyan-400 to-blue-600', glow: 'rgba(0,209,255,0.4)', unlocked: true },
                { icon: 'local_fire_department', label: 'Streak x10', color: 'from-purple-500 to-pink-600', glow: 'rgba(168,85,247,0.4)', unlocked: true },
                { icon: 'psychology', label: 'Pakar Trivia', color: 'from-orange-400 to-yellow-600', glow: 'rgba(251,146,60,0.4)', unlocked: true },
                { icon: 'diamond', label: 'Grandmaster', color: '', glow: '', unlocked: false },
                { icon: 'rocket_launch', label: 'Pertama ke Mars', color: '', glow: '', unlocked: false },
                { icon: 'social_leaderboard', label: 'Global #1', color: '', glow: '', unlocked: false },
              ].map((ach, i) => (
                <div key={i} className={`flex flex-col items-center gap-3 ${ach.unlocked ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                  <div
                    className={`w-16 h-16 rounded-full ${ach.unlocked ? `bg-gradient-to-tr ${ach.color}` : 'bg-slate-800 border border-white/10'} flex items-center justify-center`}
                    style={ach.unlocked ? { boxShadow: `0 0 20px ${ach.glow}` } : undefined}
                  >
                    <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {ach.icon}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-white text-center uppercase tracking-tighter">{ach.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      </div>
      {/* Footer */}
      <footer className="lg:ml-72 flex justify-between px-10 items-center py-4 bg-slate-950 border-t border-white/5 mt-auto">
        <p className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-cyan-500 uppercase">© 2024 QUIZBATTLE SISTEM TAKTIS</p>
        <div className="flex gap-6">
          <a className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-slate-600 hover:text-cyan-400 transition-colors" href="#">Status</a>
          <a className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-slate-600 hover:text-cyan-400 transition-colors" href="#">Privasi</a>
          <a className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-slate-600 hover:text-cyan-400 transition-colors" href="#">Dukungan</a>
        </div>
      </footer>
    </div>
  );
}
