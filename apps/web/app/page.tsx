'use client';

import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { Zap, Trophy, Users } from 'lucide-react';

export default function HomePage() {
  // We read auth state only to adapt the UI (navbar buttons), NOT to redirect
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#090f12] text-[#dde3e7] font-sans selection:bg-[#00d1ff]/30 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00d1ff]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#cf5cff]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAlRcgUxa3ii_NiSemyYTATZdxkY8hVsG8tYrDMI-5f4i-OSMvdwmNeArzA8YTnYMiHAcRoU2AvtawIzxNKCVUykPvDuvxZlEzvzqBEu3YbgZb0Xiueilikt8q-Bjvoa0Iet5LbSrzPITyl4YVx0VqD95aQbJKyqLOAtUUnYhhhAGoUGwI-U3rr4VXVCiM4BFSepr9RGcf73oqEyvQoaDUFeroqwbm36JiIdqgdB4dP-gX7GjAYLw1C-j09glY27HGwFHqSp7TTghY')",
        }}
      ></div>

      {/* Navigation */}
      <nav className="relative z-20 glass-panel border-b border-[#3c494e]/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00d1ff] to-[#cf5cff] rounded-lg flex items-center justify-center neon-glow-primary icon-box">
              <span
                className="material-symbols-outlined text-[#0e1417] text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                swords
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[#a4e6ff] italic tracking-tighter">QuizBattle</h1>
          </div>

          {/* Adaptive navbar buttons based on auth state */}
          <div className="flex gap-4 items-center">
            {isLoading ? (
              /* Show a subtle placeholder while checking auth */
              <div className="h-9 w-32 rounded-lg bg-[#1a2227] animate-pulse" />
            ) : isAuthenticated ? (
              /* User is logged in → show their name + go to dashboard */
              <>
                <span className="font-bold text-[10px] tracking-widest text-[#859399] uppercase hidden sm:block">
                  {user?.username}
                </span>
                <Link
                  href="/dashboard"
                  className="px-6 py-2 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">dashboard</span>
                  Go to Dashboard
                </Link>
              </>
            ) : (
              /* User is not logged in → show Sign In + Register */
              <>
                <Link
                  href="/auth/login"
                  className="px-6 py-2 rounded-lg font-bold text-xs tracking-widest text-[#a4e6ff] border border-[#00d1ff]/30 hover:bg-[#00d1ff]/10 transition-all uppercase flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all flex items-center justify-center"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-32 text-center flex flex-col items-center">
        <div className="inline-block glass-panel px-4 py-1 rounded-full mb-6 border border-[#00d1ff]/30">
          <span className="font-bold text-[10px] tracking-widest text-[#00d1ff] uppercase">V.2.0.4-STABLE ONLINE</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-bold text-[#dde3e7] mb-6 leading-tight">
          ENTER THE <br className="md:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d1ff] to-[#cf5cff]">ARENA.</span>
        </h2>
        <p className="text-lg md:text-xl text-[#bbc9cf] mb-12 max-w-2xl mx-auto">
          Join the ultimate tactical knowledge exchange. Rank up, dominate leaderboards, and prove your cognitive
          superiority.
        </p>
        <Link
          href={isAuthenticated ? '/dashboard' : '/auth/register'}
          className="px-10 py-5 rounded-lg font-bold text-sm tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all flex items-center justify-center gap-4"
        >
          <span>{isAuthenticated ? 'Enter the Arena' : 'Get Started Now'}</span>
          <span className="material-symbols-outlined text-2xl">{isAuthenticated ? 'swords' : 'rocket_launch'}</span>
        </Link>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold text-[#dde3e7] mb-4">TACTICAL ADVANTAGE</h3>
          <div className="h-1 w-24 bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 rounded-2xl group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-[#161d1f] rounded-xl flex items-center justify-center mb-6 border border-[#3c494e] group-hover:border-[#00d1ff] transition-colors">
              <Zap className="w-6 h-6 text-[#00d1ff]" />
            </div>
            <h4 className="text-xl font-bold text-[#dde3e7] mb-3">Lightning Fast</h4>
            <p className="text-[#bbc9cf] leading-relaxed">
              Quick questions with a 30-second timer. Test your knowledge and reflexes in high-pressure scenarios.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-[#161d1f] rounded-xl flex items-center justify-center mb-6 border border-[#3c494e] group-hover:border-[#cf5cff] transition-colors">
              <Trophy className="w-6 h-6 text-[#cf5cff]" />
            </div>
            <h4 className="text-xl font-bold text-[#dde3e7] mb-3">Compete & Rank</h4>
            <p className="text-[#bbc9cf] leading-relaxed">
              Battle with friends, earn points, and see your rank on the global leaderboard. Become the elite operator.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-[#161d1f] rounded-xl flex items-center justify-center mb-6 border border-[#3c494e] group-hover:border-[#a4e6ff] transition-colors">
              <Users className="w-6 h-6 text-[#a4e6ff]" />
            </div>
            <h4 className="text-xl font-bold text-[#dde3e7] mb-3">Community</h4>
            <p className="text-[#bbc9cf] leading-relaxed">
              Join thousands of players, form alliances, and share your tactical achievements.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 border-y border-[#3c494e]/50 py-24 mt-12 bg-gradient-to-r from-[#00d1ff]/5 to-[#cf5cff]/5">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-4xl font-bold text-[#dde3e7] mb-6">READY TO BATTLE?</h3>
          <p className="text-xl text-[#bbc9cf] mb-10">
            Sign up now and start competing with operators from around the world.
          </p>
          <Link
            href={isAuthenticated ? '/dashboard' : '/auth/register'}
            className="px-12 py-5 inline-block rounded-lg font-bold text-sm tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all"
          >
            {isAuthenticated ? 'ENTER THE ARENA' : 'INITIALIZE YOUR OPERATOR'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 glass-panel border-t border-[#3c494e]/30 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-bold text-[10px] tracking-widest text-[#859399] uppercase">
            © 2024 QUIZBATTLE TACTICAL SYSTEMS
          </div>
          <div className="flex gap-8">
            <span className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#00d1ff] transition-colors cursor-pointer uppercase">
              STATUS: ONLINE
            </span>
            <span className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#00d1ff] transition-colors cursor-pointer uppercase">
              PRIVACY PROTOCOL
            </span>
            <span className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#00d1ff] transition-colors cursor-pointer uppercase">
              SUPPORT HUB
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
