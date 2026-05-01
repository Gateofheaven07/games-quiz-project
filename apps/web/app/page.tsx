'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Zap, Trophy, Users, Menu, X } from 'lucide-react';

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#00d1ff] to-[#cf5cff] rounded-lg flex items-center justify-center neon-glow-primary icon-box">
              <span
                className="material-symbols-outlined text-[#0e1417] text-xl sm:text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                swords
              </span>
            </div>
            <h1 className="text-[1.125rem] sm:text-2xl font-bold text-[#a4e6ff] italic tracking-tighter leading-none">QuizBattle</h1>
          </div>

          {/* Hamburger button for mobile */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#a4e6ff] hover:text-white p-2"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop navbar buttons */}
          <div className="hidden md:flex gap-4 items-center">
            {isLoading ? (
              <div className="h-9 w-32 rounded-lg bg-[#1a2227] animate-pulse" />
            ) : isAuthenticated ? (
              <>
                <span className="font-bold text-[10px] tracking-widest text-[#859399] uppercase">
                  {user?.username}
                </span>
                <Link
                  href="/dashboard"
                  className="px-6 py-2 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">dashboard</span>
                  Masuk ke Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-6 py-2 rounded-lg font-bold text-xs tracking-widest text-[#a4e6ff] border border-[#00d1ff]/30 hover:bg-[#00d1ff]/10 transition-all uppercase flex items-center justify-center"
                >
                  Masuk
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all flex items-center justify-center"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Sidebar Overlay */}
        <div 
          className={`md:hidden absolute top-[100%] left-0 w-full bg-[#090f12]/95 backdrop-blur-xl border-b border-[#3c494e]/30 shadow-2xl z-50 p-6 flex flex-col gap-4 transition-all duration-300 ease-out origin-top ${
            isMobileMenuOpen 
              ? 'opacity-100 scale-y-100 pointer-events-auto' 
              : 'opacity-0 scale-y-95 pointer-events-none'
          }`}
        >
          {isLoading ? (
            <div className="h-9 w-full rounded-lg bg-[#1a2227] animate-pulse" />
          ) : isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 px-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d1ff] to-[#cf5cff] flex items-center justify-center text-[#0e1417] font-bold">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-xs text-[#859399] uppercase tracking-widest">Operator</p>
                  <p className="font-bold text-[#dde3e7]">{user?.username}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                Masuk ke Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 rounded-lg font-bold text-xs tracking-widest text-[#a4e6ff] border border-[#00d1ff]/30 hover:bg-[#00d1ff]/10 transition-all uppercase flex items-center justify-center"
              >
                Masuk
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 rounded-lg font-bold text-xs tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary active:scale-95 transition-all flex items-center justify-center"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-32 text-center flex flex-col items-center">
        <div className="inline-block glass-panel px-4 py-1 rounded-full mb-6 border border-[#00d1ff]/30">
          <span className="font-bold text-[10px] tracking-widest text-[#00d1ff] uppercase">V.2.0.4-STABLE ONLINE</span>
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold text-[#dde3e7] mb-4 sm:mb-6 leading-tight">
          MASUK KE <br className="md:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d1ff] to-[#cf5cff]">ARENA.</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-[#bbc9cf] mb-8 sm:mb-12 max-w-2xl mx-auto px-2">
          Bergabunglah dalam pertukaran pengetahuan taktis terbaik. Tingkatkan peringkat, kuasai leaderboard, dan buktikan keunggulan kognitifmu.
        </p>
        <Link
          href={isAuthenticated ? '/dashboard' : '/auth/register'}
          className="px-6 sm:px-10 py-3 sm:py-5 rounded-lg font-bold text-xs sm:text-sm tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-4 w-full sm:w-auto"
        >
          <span>{isAuthenticated ? 'Masuk ke Arena' : 'Mulai Sekarang'}</span>
          <span className="material-symbols-outlined text-xl sm:text-2xl">{isAuthenticated ? 'swords' : 'rocket_launch'}</span>
        </Link>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold text-[#dde3e7] mb-4">KEUNGGULAN TAKTIS</h3>
          <div className="h-1 w-24 bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 rounded-2xl group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-[#161d1f] rounded-xl flex items-center justify-center mb-6 border border-[#3c494e] group-hover:border-[#00d1ff] transition-colors">
              <Zap className="w-6 h-6 text-[#00d1ff]" />
            </div>
            <h4 className="text-xl font-bold text-[#dde3e7] mb-3">Sangat Cepat</h4>
            <p className="text-[#bbc9cf] leading-relaxed">
              Pertanyaan cepat dengan pengatur waktu 30 detik. Uji pengetahuan dan refleksmu dalam skenario bertekanan tinggi.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-[#161d1f] rounded-xl flex items-center justify-center mb-6 border border-[#3c494e] group-hover:border-[#cf5cff] transition-colors">
              <Trophy className="w-6 h-6 text-[#cf5cff]" />
            </div>
            <h4 className="text-xl font-bold text-[#dde3e7] mb-3">Bersaing & Peringkat</h4>
            <p className="text-[#bbc9cf] leading-relaxed">
              Bertarung dengan teman, kumpulkan poin, dan lihat peringkatmu di leaderboard global. Jadilah operator elit.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-[#161d1f] rounded-xl flex items-center justify-center mb-6 border border-[#3c494e] group-hover:border-[#a4e6ff] transition-colors">
              <Users className="w-6 h-6 text-[#a4e6ff]" />
            </div>
            <h4 className="text-xl font-bold text-[#dde3e7] mb-3">Komunitas</h4>
            <p className="text-[#bbc9cf] leading-relaxed">
              Bergabunglah dengan ribuan pemain, bentuk aliansi, dan bagikan pencapaian taktismu.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 border-y border-[#3c494e]/50 py-16 sm:py-24 mt-8 sm:mt-12 bg-gradient-to-r from-[#00d1ff]/5 to-[#cf5cff]/5">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6">
          <h3 className="text-3xl sm:text-4xl font-bold text-[#dde3e7] mb-4 sm:mb-6">SIAP BERTARUNG?</h3>
          <p className="text-base sm:text-xl text-[#bbc9cf] mb-8 sm:mb-10">
            Daftar sekarang dan mulailah bersaing dengan operator dari seluruh dunia.
          </p>
          <Link
            href={isAuthenticated ? '/dashboard' : '/auth/register'}
            className="px-8 sm:px-12 py-4 sm:py-5 w-full sm:w-auto inline-block rounded-lg font-bold text-xs sm:text-sm tracking-widest text-[#0e1417] uppercase bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] neon-glow-primary hover:neon-glow-hover active:scale-95 transition-all"
          >
            {isAuthenticated ? 'MASUK KE ARENA' : 'INISIALISASI OPERATOR ANDA'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 glass-panel border-t border-[#3c494e]/30 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-[10px] tracking-widest text-[#859399] uppercase text-center md:text-left">
            © 2024 QUIZBATTLE SISTEM TAKTIS
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
            <span className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#00d1ff] transition-colors cursor-pointer uppercase">
              STATUS: AKTIF
            </span>
            <span className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#00d1ff] transition-colors cursor-pointer uppercase">
              PROTOKOL PRIVASI
            </span>
            <span className="font-bold text-[10px] tracking-widest text-[#859399] hover:text-[#00d1ff] transition-colors cursor-pointer uppercase">
              PUSAT BANTUAN
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
