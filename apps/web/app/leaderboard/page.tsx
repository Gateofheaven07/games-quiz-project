'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { leaderboardApi } from '../../lib/api';
import { AppSidebar, AppMobileNav } from '../../components/AppSidebar';
export default function LeaderboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('allTime');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

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

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="font-body-md text-on-background min-h-screen flex flex-col bg-[#0e1417]" style={{backgroundImage: "radial-gradient(circle at 20% 30%, rgba(0, 209, 255, 0.05) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(207, 92, 255, 0.05) 0%, transparent 40%)"}}>
      

      <AppMobileNav active="Peringkat" />
      <div style={{ display: 'flex', flex: 1, width: '100%' }}>
        <AppSidebar active="Peringkat" />

<main className="flex-1 mt-16 lg:ml-72 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto pb-40 overflow-x-hidden">
<header className="mb-10 text-center lg:text-left">
<div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1 mb-4">
<span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
<span className="font-label-caps text-cyan-400">STATISTIK GLOBAL LANGSUNG</span>
</div>
<h1 className="font-h1 text-on-surface mb-2">Pemain Terbaik Mingguan</h1>
<p className="font-body-lg text-on-surface-variant max-w-2xl">Berjuang untuk supremasi di arena digital. Pemain top menerima perlengkapan eksklusif dan Kredit Operator setiap hari Senin.</p>
</header>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

<div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center order-2 md:order-1 border-white/10 neon-glow-silver">
<div className="relative mb-4">
<img alt="Silver Medal Player" className="h-20 w-20 rounded-full border-2 border-outline-variant" data-alt="Cyberpunk character portrait with silver robotic arm and neon visor in a rainy neon city setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpm6Pl2DG_AtUXePCS4pEjRj5p0XseMZa_Qw9LtXIZwNTXz6s3pzxFRDFOS__VQ3vZIdvVEdCWCUlPSL5WeDGPksothsshxwjjjIV1407RRNdVdrL6VPqPwBQVFBIiNYBOVLp9T6L1xlOaaonGGnXhlYU0DoeO3aShu0xAKWxLSupSuYaO1aCY_tK9ndnFSo9G2No5L6z0A-AbIsw5GBKnYTU1alTCWgdDcGIO1eRG9uzzfzYHCcuE1pHzxO1uDUQj_FsrAecj0yk"/>
<div className="absolute -bottom-2 -right-2 bg-outline-variant h-8 w-8 rounded-full flex items-center justify-center border-2 border-surface font-black text-xs">2</div>
</div>
<h3 className="font-h3 text-on-surface">V_Ghost</h3>
<p className="font-label-caps text-secondary-fixed-dim mb-4">STREAK ELITE</p>
<div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-secondary-fixed-dim w-[85%]"></div>
</div>
<div className="flex justify-between w-full mt-2">
<span className="text-[10px] font-bold text-slate-500">SKOR</span>
<span className="text-[10px] font-bold text-on-surface">42.900</span>
</div>
</div>

<div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center order-1 md:order-2 border-cyan-400/30 scale-105 neon-glow-gold bg-gradient-to-b from-tertiary-container/10 to-transparent">
<div className="relative mb-6">
<div className="absolute inset-0 bg-tertiary-container blur-2xl opacity-20 animate-pulse"></div>
<img alt="Gold Medal Player" className="relative h-28 w-28 rounded-full border-4 border-tertiary-container" data-alt="Heroic futuristic commander with gold armored detailing and glowing cybernetic eyes professional lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhim7NM9vaeBgI6s3vpK8UrYz3mCcLpqIAvK-SRX1X4aAKMDJRcsw6hsnfGmA8WrXg3CZNmkfYE6iPLoW1amKWtst5sC2_ZaVpV12-6HWlRYQsHwE_WnlqC7QtSwjWfIR2vYDKiw7H5i5k8EYpw9i0Fx89g9aO-1dGCj4TAJpmW1YtNkg_7U_0I9LAIoeHXs-ApB1e4UaQGCoR73bGGKesPS0oMSa7cWs55fsjZYmlaHBBPgQyjiN3L-Vz63askQYbpAEQtyrdv1g"/>
<div className="absolute -bottom-3 -right-3 bg-tertiary-container h-10 w-10 rounded-full flex items-center justify-center border-4 border-surface font-black text-sm text-on-tertiary-container">1</div>
</div>
<h2 className="font-h2 text-tertiary-fixed mb-1">X_Terminator</h2>
<p className="font-label-caps text-tertiary mb-6">TAK TERHENTIKAN</p>
<div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-tertiary-container w-[98%] relative">
<div className="absolute inset-0 progress-shimmer animate-shimmer"></div>
</div>
</div>
<div className="flex justify-between w-full mt-3">
<span className="text-xs font-bold text-tertiary/50">SKOR PERTANDINGAN</span>
<span className="text-xs font-bold text-tertiary-fixed">51.240</span>
</div>
</div>

<div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center order-3 md:order-3 border-white/10 neon-glow-bronze">
<div className="relative mb-4">
<img alt="Bronze Medal Player" className="h-20 w-20 rounded-full border-2 border-on-tertiary-fixed-variant" data-alt="Tactical specialist with bronze plating and glowing communication headset in a dark tech environment" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6IodHfZwI4Ht-nQtCcj4hQFEgwWxxTSwoh1SBhTqWUCldEO0Sb1yafPWq0kiCkogT-Q9bqNnU6ANDEc8jlrAD1aUK7V-aBIheDAMqcgmKFJZK94GzwkSq0B7fCuimgrQWNYP0Bs44ZiyLGnoK0blL-WC-Zgr875SyTJwnMo4SuRq224wxQJJUi4Lxgh2CBW2BIIBpX7z9637vl7H3XCtRhf8969Qm4S6Zefwg2GWWb5hynndZz6Hmpc6jhXV6WkC9bY6maglGdAI"/>
<div className="absolute -bottom-2 -right-2 bg-on-tertiary-fixed-variant h-8 w-8 rounded-full flex items-center justify-center border-2 border-surface font-black text-xs">3</div>
</div>
<h3 className="font-h3 text-on-surface">Neon_Pulse</h3>
<p className="font-label-caps text-on-tertiary-fixed mb-4">VETERAN TEMPUR</p>
<div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-on-tertiary-fixed-variant w-[72%]"></div>
</div>
<div className="flex justify-between w-full mt-2">
<span className="text-[10px] font-bold text-slate-500">SKOR</span>
<span className="text-[10px] font-bold text-on-surface">38.150</span>
</div>
</div>
</div>

<section className="glass-card rounded-xl overflow-hidden mb-12">
<div className="bg-white/5 px-8 py-4 flex justify-between items-center border-b border-white/10">
<span className="font-label-caps text-slate-400">DAFTAR PERINGKAT (4-10)</span>
<div className="flex gap-4">
<button className="text-[10px] font-bold text-cyan-400 border-b border-cyan-400">GLOBAL</button>
<button className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">TEMAN</button>
</div>
</div>
<div className="divide-y divide-white/5">

<div className="px-8 py-5 flex items-center gap-6 hover:bg-white/5 transition-all group">
<span className="w-8 font-h3 text-slate-500 group-hover:text-cyan-400 transition-colors">04</span>
<img alt="Player Avatar" className="h-10 w-10 rounded-lg border border-white/10" data-alt="Minimalist digital avatar of a player with blue glowing accents and dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw0AevwlPcO72TXS0p-zAC-8ogif_M18bH4wlAWdRoJjlUsWDPySLq1x-Q3zYhKXIj2k_nL8Cc8jEtfNX06RDIGNbryz_QBBWLeF_XgypCv_LYPrlRjkC4K0CmT_UdTrv18Nt0iHPyAZ_3soV-ytV7IdKHDumdpq7h30a0d0pZDwnYll5LXg9lKmEEKqatxpUWafsSSfTSj-23It8hx8_qTG0Myn-iWLfBbRVT8FNIShrvl4FNkLkFI0LJWsArdHGgcGgNuh_e6D4"/>
<div className="flex-1">
<p className="font-body-md font-bold text-on-surface">Cipher_Zero</p>
<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PERINGKAT MASTER</p>
</div>
<div className="text-right">
<p className="font-h3 text-on-surface text-lg">34.500</p>
<p className="text-[10px] font-bold text-cyan-500/50">+1.200 hari ini</p>
</div>
</div>

<div className="px-8 py-5 flex items-center gap-6 hover:bg-white/5 transition-all group">
<span className="w-8 font-h3 text-slate-500 group-hover:text-cyan-400 transition-colors">05</span>
<img alt="Player Avatar" className="h-10 w-10 rounded-lg border border-white/10" data-alt="Minimalist digital avatar of a player with purple glowing accents and dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6aS_-E9ApNS-qbZTjIgTIP9ds5_N0yKKYtXcURtFeozakeAmxAAimtzpyoXG12dEvHYEjlY0Kh0hqEg4E4FmOYssuH8-OKFXiYlp1AurPYMJnwsCwzaPuNDZfFIkr3XMkLI79P4Rgv_F1MfYl6JTfF4-OoNZY7iWrKCSdXRTCyzxRaWzQSWKyFI1OU91RC4F5XPZErr7YPuGXr9Ay9r1n8T0Kz0Tv0dRVQkqbH2uSPHWwdyJJDf4iiyvDvpl1HMs-SYDeug2uxKI"/>
<div className="flex-1">
<p className="font-body-md font-bold text-on-surface">Void_Walker</p>
<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DIAMOND II</p>
</div>
<div className="text-right">
<p className="font-h3 text-on-surface text-lg">31,200</p>
<p className="text-[10px] font-bold text-error/50">-450 today</p>
</div>
</div>

<div className="px-8 py-5 flex items-center gap-6 hover:bg-white/5 transition-all group">
<span className="w-8 font-h3 text-slate-500 group-hover:text-cyan-400 transition-colors">06</span>
<img alt="Player Avatar" className="h-10 w-10 rounded-lg border border-white/10" data-alt="Minimalist digital avatar of a player with orange glowing accents and dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSCR3NM-4a_xu3e_cDjKuFqajdl9fdTB7Ne1AgCqv3xd7lSVDLuXAzXtmfBYkIqKf4qZTmY8_QFa6tZXFSzlx2LJUKN1h6G8KVhIi_FqW8K5scTCQpf5xeVDWsNLcdF9wEwY1QqLlGSslBmtUFI2G5gl2rswJQk7mKrqHY0Mf87A_n5VMnmrFadugLJMbZNZfmhScKZiAh9XjI8imBoOkXuHfznMaeIr48ohLuxHJUPSbRpfs4L6jE7E5kl0laNK28dKnie5M1Z0U"/>
<div className="flex-1">
<p className="font-body-md font-bold text-on-surface">Static_Shock</p>
<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DIAMOND I</p>
</div>
<div className="text-right">
<p className="font-h3 text-on-surface text-lg">29,880</p>
<p className="text-[10px] font-bold text-cyan-500/50">+80 today</p>
</div>
</div>

<div className="px-8 py-5 flex items-center gap-6 hover:bg-white/5 transition-all group">
<span className="w-8 font-h3 text-slate-500 group-hover:text-cyan-400 transition-colors">07</span>
<img alt="Player Avatar" className="h-10 w-10 rounded-lg border border-white/10" data-alt="Minimalist digital avatar of a player with green glowing accents and dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuaa37O98qEk5LR6Gh0LfrbP1tbItFAT6CYo0kuto_Cxq6CAH_LxCcio5I9ZfqKbuA3GqT_15L_89E957JpPrXlV5ULnIKXi03vIVJKdgSOA9hnBfcXu_7QT-n_MCjZE4fCeg_w3hssKc6dk534llWjuInH03MNLsWpn2fIIv-5HortG8128BhAbCTOV8e5GrkJpaSS-1RL5APh1YHNu1LFvPoMCe3Q_U6y_GcqB5pJkwHdvCK1wi4ZR53sRmG9vurMmtOmqp32T8"/>
<div className="flex-1">
<p className="font-body-md font-bold text-on-surface">Bit_Crusher</p>
<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PLATINUM IV</p>
</div>
<div className="text-right">
<p className="font-h3 text-on-surface text-lg">28,450</p>
<p className="text-[10px] font-bold text-cyan-500/50">+3,400 today</p>
</div>
</div>
</div>
<div className="p-6 bg-white/5 text-center">
<button className="font-label-caps text-cyan-400 hover:text-white transition-all">MUAT SELURUH LEADERBOARD</button>
</div>
</section>

<div className="fixed bottom-4 sm:bottom-12 left-1/2 -translate-x-1/2 lg:left-[calc(50%+144px)] w-[95%] sm:w-[90%] max-w-4xl glass-card rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-6 border border-cyan-400/40 shadow-[0_0_50px_rgba(0,209,255,0.3)] z-30 bg-[#0e1417]/95 backdrop-blur-2xl">
<div className="bg-cyan-500/20 text-cyan-400 h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex flex-col items-center justify-center shrink-0">
<span className="text-[8px] sm:text-[10px] font-bold">LVL</span>
<span className="font-h3 text-base sm:text-lg leading-none">{user?.level || 0}</span>
</div>
{user?.avatar ? (
  <img src={user.avatar} alt="My Profile" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg border border-cyan-400 object-cover shrink-0" />
) : (
  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg border border-cyan-400 bg-slate-800 flex items-center justify-center text-cyan-400 font-bold shrink-0">
    {user?.username?.charAt(0).toUpperCase() || 'O'}
  </div>
)}
<div className="flex-1 min-w-0">
<p className="font-body-md font-bold text-on-surface uppercase truncate text-sm sm:text-base">{user?.username || 'OPERATOR'}</p>
<div className="flex items-center gap-2">
<div className="h-1 sm:h-1.5 w-16 sm:w-32 bg-white/10 rounded-full overflow-hidden shrink-0">
<div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, ((user?.totalScore || 0) % 1000) / 10)}%` }}></div>
</div>
<span className="text-[8px] sm:text-[10px] text-slate-400 font-bold truncate hidden sm:inline">{1000 - ((user?.totalScore || 0) % 1000)} XP KE PERINGKAT BERIKUTNYA</span>
</div>
</div>
<div className="text-right px-2 sm:px-4 border-l border-white/10 shrink-0">
<p className="text-[8px] sm:text-[10px] font-bold text-slate-500">SKOR</p>
<p className="font-h3 text-cyan-400 text-sm sm:text-base">{user?.totalScore || 0}</p>
</div>
<Link href="/profile" className="h-8 w-8 sm:h-12 sm:w-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
<span className="material-symbols-outlined text-white text-sm sm:text-base">chevron_right</span>
</Link>
</div>
</main>
      </div>
<footer className="lg:ml-72 flex justify-between px-10 items-center mt-auto py-4 bg-slate-950 border-t border-white/5">
<span className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-cyan-500 uppercase">© 2024 QUIZBATTLE SISTEM TAKTIS</span>
<div className="flex gap-6">
<a className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-slate-600 hover:text-cyan-400 transition-all uppercase" href="#">Status</a>
<a className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-slate-600 hover:text-cyan-400 transition-all uppercase" href="#">Privasi</a>
<a className="font-['Space_Grotesk'] text-[10px] tracking-widest opacity-50 text-slate-600 hover:text-cyan-400 transition-all uppercase" href="#">Bantuan</a>
</div>
</footer>

    </div>
  );
}
