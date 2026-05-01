'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'

interface UserStats {
  totalScore: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
}

function getRankLabel(score: number): string {
  if (score >= 10000) return 'DIAMOND';
  if (score >= 5000) return 'GOLD';
  if (score >= 2000) return 'SILVER';
  if (score >= 500) return 'BRONZE';
  return 'RECRUIT';
}

export function AppSidebar({ active, userStats }: { active: string; userStats?: UserStats | null }) {
  const router = useRouter()
  const { logout, user } = useAuth()
  const { unreadCount } = useNotifications()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const navItems = [
    { icon: 'dashboard',      label: 'Dashboard',     href: '/dashboard' },
    { icon: 'notifications',  label: 'Notifikasi',    href: '/notifications' },
    { icon: 'group',          label: 'Teman',         href: '/friends' },
    { icon: 'leaderboard',    label: 'Peringkat',      href: '/leaderboard' },
    { icon: 'person',         label: 'Profil',       href: '/profile' },
  ]

  return (
    <aside className="hidden lg:flex flex-col w-72 min-w-[288px] h-screen fixed left-0 top-0 bg-[#0b0e14]/80 backdrop-blur-xl border-r border-white/5 py-8 px-6 z-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {/* Logo Section */}
      <div className="mb-10 px-2">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/dashboard')}>
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-white text-2xl">rocket_launch</span>
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black italic tracking-[-0.05em] text-white leading-none">
              Quiz<span className="text-cyan-400">Battle</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1.5 ml-0.5">
              Arena Taktis
            </p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="glass-panel p-4 mb-8 border-white/5 hover:border-white/10 transition-colors group">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-cyan-400 font-black text-lg group-hover:scale-105 transition-transform">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">
              {user?.username || 'Pemain'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Online
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-4">
          Navigasi Utama
        </p>
        {navItems.map((item) => {
          const isActive = active === item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/5' 
                  : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-xl transition-colors ${
                  isActive ? 'text-cyan-400' : 'group-hover:text-cyan-400'
                }`}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold tracking-wide">{item.label}</span>
              </div>
              
              {item.label === 'Notifikasi' && unreadCount > 0 && (
                <div className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white px-1 shadow-lg shadow-red-500/20">
                  {unreadCount}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="mt-auto pt-8 border-t border-white/5 space-y-2">
        <Link 
          href="/profile/settings" 
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/[0.03] hover:text-white transition-all group"
        >
          <span className="material-symbols-outlined text-xl group-hover:text-cyan-400 transition-colors">settings</span>
          <span className="text-sm font-bold tracking-wide">Pengaturan</span>
        </Link>
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:bg-red-500/5 hover:text-red-400 transition-all group"
        >
          <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">logout</span>
          <span className="text-sm font-bold tracking-wide">Keluar</span>
        </button>
      </div>
    </aside>
  )
}

export function AppMobileNav({ active }: { active: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { logout, user } = useAuth()
  const { unreadCount } = useNotifications()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const navItems = [
    { icon: 'dashboard',      label: 'Dashboard',     href: '/dashboard' },
    { icon: 'notifications',  label: 'Notifikasi',    href: '/notifications' },
    { icon: 'group',          label: 'Teman',         href: '/friends' },
    { icon: 'leaderboard',    label: 'Peringkat',     href: '/leaderboard' },
    { icon: 'person',         label: 'Profil',        href: '/profile' },
  ]

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between h-16 px-5 bg-[#0b0e14]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="material-symbols-outlined text-white text-lg">rocket_launch</span>
          </div>
          <h1 className="text-lg font-black italic tracking-tighter text-white font-heading leading-none">
            Quiz<span className="text-cyan-400">Battle</span>
          </h1>
        </div>

        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white active:scale-90 transition-transform relative"
        >
          <span className="material-symbols-outlined">{isOpen ? 'close' : 'menu'}</span>
          {!isOpen && unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0b0e14] shadow-sm"></span>
          )}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute top-0 right-0 w-80 h-full bg-[#0b0e14] border-l border-white/10 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{user?.username || 'Pemain'}</p>
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Drawer Nav */}
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = active === item.label;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                        : 'text-slate-400 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                      <span className="font-bold tracking-wide">{item.label}</span>
                    </div>
                    {item.label === 'Notifikasi' && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="mt-auto pt-8 border-t border-white/5 space-y-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-red-400/70 active:bg-red-500/5 transition-all"
              >
                <span className="material-symbols-outlined text-2xl">logout</span>
                <span className="font-bold tracking-wide">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

