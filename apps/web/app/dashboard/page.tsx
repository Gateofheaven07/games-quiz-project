'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

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

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function Sidebar({ active, userStats }: { active: string; userStats?: UserStats | null }) {
  const router = useRouter()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const navItems = [
    { icon: 'dashboard',      label: 'Dashboard',     href: '/dashboard' },
    { icon: 'swords',         label: 'Arena Pertempuran',  href: '/game/lobby' },
    { icon: 'sports_esports', label: 'Arkade',        href: '/game/crossword' },
    { icon: 'group',          label: 'Teman',       href: '/friends' },
    { icon: 'leaderboard',    label: 'Peringkat',      href: '/leaderboard' },
    { icon: 'person',         label: 'Profil',       href: '/profile' },
  ]

  return (
    <aside className="hidden md:flex flex-col w-[260px] min-w-[260px] bg-[var(--c-surface-low)] border-r border-[var(--c-outline-variant)] py-6 px-4 gap-2 z-20 relative">
      {/* Logo */}
      <div style={{ marginBottom: 32, paddingInline: 8 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00d1ff, #cf5cff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          ⚡ QuizBattle
        </h1>
        <p className="label-caps" style={{ color: 'var(--c-outline)', marginTop: 4 }}>
          Arena Permainan Taktis
        </p>
      </div>

      {/* User chip */}
      <div
        className="glass-panel"
        style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d1ff, #cf5cff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '1rem',
            color: '#003543',
          }}
        >
          O1
        </div>
        <div>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: 'var(--c-on-surface)' }}>
            {user?.username || 'OPERATOR_01'}
          </p>
          <span className="badge badge-gold" style={{ marginTop: 2 }}>PERINGKAT {getRankLabel(userStats?.totalScore ?? 0)}</span>
        </div>
      </div>

      {/* Nav links */}
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${active === item.label ? 'active' : ''}`}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Settings */}
      <Link href="/profile/settings" className="nav-item">
        <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>settings</span>
        Pengaturan
      </Link>

      {/* Logout */}
      <button 
        onClick={handleLogout} 
        className="nav-item" 
        style={{ 
          color: '#ffb4ab', 
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          marginTop: '8px'
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>logout</span>
        Keluar
      </button>
    </aside>
  )
}

function MobileNav({ active, handleLogout }: { active: string; handleLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const navItems = [
    { icon: 'dashboard',      label: 'Dashboard',     href: '/dashboard' },
    { icon: 'swords',         label: 'Arena',         href: '/game/lobby' },
    { icon: 'sports_esports', label: 'Arkade',        href: '/game/crossword' },
    { icon: 'group',          label: 'Teman',         href: '/friends' },
    { icon: 'leaderboard',    label: 'Peringkat',     href: '/leaderboard' },
    { icon: 'person',         label: 'Profil',        href: '/profile' },
  ]

  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-[var(--c-surface-low)] border-b border-[var(--c-outline-variant)] sticky top-0 z-50">
      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] font-['Space_Grotesk']">
        ⚡ QuizBattle
      </h1>
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-[var(--c-on-surface)]">
        <span className="material-symbols-rounded">{isOpen ? 'close' : 'menu'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-[var(--c-surface-low)] border-b border-[var(--c-outline-variant)] flex flex-col p-4 gap-2 shadow-xl">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active === item.label ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
          <div className="h-px w-full bg-[var(--c-outline-variant)] my-2"></div>
          <button 
            onClick={handleLogout} 
            className="nav-item text-left text-[#ffb4ab]" 
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>logout</span>
            Keluar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Game Mode Card ─────────────────────────────────────────────────────────────
function GameModeCard({
  icon,
  title,
  description,
  href,
  badge,
  accent,
}: {
  icon: string
  title: string
  description: string
  href: string
  badge?: string
  accent: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        className="glass-panel"
        style={{
          padding: 24,
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(-4px)'
          el.style.boxShadow = `0 8px 32px ${accent}40`
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = ''
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '0.75rem',
              background: `${accent}18`,
              border: `1px solid ${accent}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.5rem', color: accent }}>
              {icon}
            </span>
          </div>
          {badge && <span className="badge badge-primary">{badge}</span>}
        </div>

        <h3
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '1.125rem',
            color: 'var(--c-on-surface)',
            marginBottom: 8,
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--c-on-surface-variant)', lineHeight: 1.5 }}>
          {description}
        </p>

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: accent,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          MAIN SEKARANG
          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>arrow_forward</span>
        </div>
      </div>
    </Link>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, extraBadge }: { label: string; value: string; sub: string; accent: string; extraBadge?: string }) {
  return (
    <div
      className="glass-panel"
      style={{ padding: 24, position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <p className="label-caps" style={{ color: 'var(--c-on-surface-variant)', margin: 0 }}>{label}</p>
        {extraBadge && (
          <span style={{ fontSize: '0.55rem', background: `${accent}20`, color: accent, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {extraBadge}
          </span>
        )}
      </div>
      <p
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '2.25rem',
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </p>
      <p className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.6875rem' }}>{sub}</p>
    </div>
  )
}

// ── Weekly Top Players ─────────────────────────────────────────────────────────
const topPlayers = [
  { rank: 1, name: 'ViperX',    wins: '2,450', badge: '🥇' },
  { rank: 2, name: 'Nova_Core', wins: '2,120', badge: '🥈' },
  { rank: 3, name: 'ZeroDay',   wins: '1,980', badge: '🥉' },
  { rank: 4, name: 'Cipher_',   wins: '1,740', badge: '' },
]

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [battlePassHovered, setBattlePassHovered] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const router = useRouter()
  const { isAuthenticated, isLoading, user, getAuthClient, logout } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchStats = async () => {
      try {
        const client = getAuthClient();
        const res = await client.get('/users/profile');
        const data = res.data?.data;
        if (data) {
          const wins = data.wins ?? 0;
          const losses = data.losses ?? 0;
          const gamesPlayed = wins + losses;
          const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
          setUserStats({
            totalScore: data.totalScore ?? 0,
            wins,
            losses,
            gamesPlayed,
            winRate,
          });
        }
      } catch {
        setUserStats({ totalScore: 0, wins: 0, losses: 0, gamesPlayed: 0, winRate: 0 });
      }
    };
    fetchStats();
  }, [isAuthenticated, user, getAuthClient])

  if (isLoading || !isAuthenticated) return null

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--c-bg)] relative">
      {/* Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
      `}</style>

      {/* Background orbs */}
      <div className="bg-orb bg-orb-blue" style={{ top: -100, left: 200 }} />
      <div className="bg-orb bg-orb-purple" style={{ bottom: 0, right: 100 }} />

      {/* Sidebar */}
      <Sidebar active="Dashboard" userStats={userStats} />
      
      {/* Mobile Nav */}
      <MobileNav active="Dashboard" handleLogout={() => {
        logout()
        router.push('/auth/login')
      }} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 w-full">

        {/* Welcome header */}
        <div style={{ marginBottom: 32 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <p className="label-caps" style={{ color: 'var(--c-primary-container)', marginBottom: 4 }}>
                ⚡ Selamat datang kembali
              </p>
              <h2
                className="text-2xl sm:text-[2rem] font-bold font-['Space_Grotesk'] text-[var(--c-on-surface)] tracking-tight"
              >
                {user?.username || 'OPERATOR_01'}
              </h2>
              <p className="text-sm sm:text-[0.9375rem] text-[var(--c-on-surface-variant)] mt-1">
                Efisiensi tempur Anda naik{' '}
                <span style={{ color: '#4aff91', fontWeight: 600 }}>+12%</span> minggu ini. Siap untuk pertempuran berikutnya?
              </p>
            </div>
            <button className="btn-primary w-full sm:w-auto justify-center" style={{ gap: 8 }}>
              <span className="material-symbols-rounded">swords</span>
              Pertarungan Cepat
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Skor Pertempuran"
            value={userStats ? userStats.totalScore.toLocaleString() : '0'}
            sub={userStats ? `Peringkat: ${getRankLabel(userStats.totalScore)}` : 'Memuat...'}
            accent="#00d1ff"
            extraBadge="Hanya Statistik Pertarungan Real"
          />
          <StatCard
            label="Tingkat Kemenangan"
            value={userStats ? `${userStats.winRate}%` : '0%'}
            sub={userStats ? `${userStats.wins}W / ${userStats.losses}L` : 'Loading...'}
            accent="#cf5cff"
          />
          <StatCard
            label="Permainan Dimainkan"
            value={userStats ? String(userStats.gamesPlayed) : '0'}
            sub="Musim ini"
            accent="#ffd59c"
          />
        </div>

        {/* Game Modes */}
        <div style={{ marginBottom: 32 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Space_Grotesk'] font-bold text-lg text-[var(--c-on-surface)]">
              Mode Permainan
            </h3>
            <span className="badge badge-live">3 Ruang Aktif</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GameModeCard
              icon="swords"
              title="Kuis Pertempuran"
              description="Pertempuran trivia taktis 1 lawan 1 secara langsung. Hancurkan inti lawanmu dengan pengetahuan."
              href="/game/lobby"
              badge="LIVE"
              accent="#00d1ff"
            />
            <GameModeCard
              icon="grid_view"
              title="Teka-teki Silang"
              description="Selesaikan kisi kata taktis untuk membuka skin senjata terenkripsi dan bonus XP."
              href="/game/crossword"
              accent="#cf5cff"
            />
            <GameModeCard
              icon="view_comfy_alt"
              title="Tetris"
              description="Penalaran spasial kecepatan tinggi. Susun, hapus, dan kuasai arena."
              href="/game/tetris"
              accent="#feb127"
            />
          </div>
        </div>

        {/* Bottom row: leaderboard + battle pass */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Weekly Top Players */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--c-on-surface)',
                }}
              >
                Pemain Terbaik Mingguan
              </h3>
              <Link
                href="/leaderboard"
                className="label-caps"
                style={{ color: 'var(--c-primary-container)', textDecoration: 'none', fontSize: '0.6875rem' }}
              >
                Lihat Semua →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topPlayers.map((player) => (
                <div
                  key={player.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: '0.75rem',
                    backgroundColor: player.rank === 1 ? 'rgba(254,177,39,0.06)' : 'var(--c-surface)',
                    border: player.rank === 1 ? '1px solid rgba(254,177,39,0.2)' : '1px solid var(--c-outline-variant)',
                  }}
                >
                  <span style={{ fontSize: '1.25rem', width: 28, textAlign: 'center' }}>
                    {player.badge || `#${player.rank}`}
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00d1ff, #cf5cff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#003543',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {player.name[0]}
                  </div>
                  <p style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem', color: 'var(--c-on-surface)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {player.name}
                  </p>
                  <span className="label-caps" style={{ color: player.rank === 1 ? '#feb127' : 'var(--c-on-surface-variant)', fontSize: '0.6875rem' }}>
                    {player.wins} kemenangan
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Battle Pass */}
          <div
            className="glass-panel"
            style={{
              padding: 24,
              background: 'linear-gradient(135deg, rgba(0,209,255,0.06), rgba(207,92,255,0.06))',
              border: '1px solid rgba(0,209,255,0.2)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              transform: battlePassHovered ? 'translateY(-2px)' : 'none',
            }}
            onMouseEnter={() => setBattlePassHovered(true)}
            onMouseLeave={() => setBattlePassHovered(false)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p className="label-caps" style={{ color: 'var(--c-primary-container)', marginBottom: 4 }}>
                  Battle Pass
                </p>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--c-on-surface)',
                  }}
                >
                  Season 04
                </h3>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '0.6rem' }}>ACTIVE</span>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--c-on-surface-variant)', marginBottom: 20 }}>
              Buka skin legendaris{' '}
              <span style={{ color: '#cf5cff', fontWeight: 600 }}>'Glitch Protocol'</span>{' '}
              di Tier 50.
            </p>

            {/* Progress */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="label-caps" style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.6875rem' }}>Kemajuan</span>
                <span className="label-caps" style={{ color: 'var(--c-primary-container)', fontSize: '0.6875rem' }}>TIER 22/50</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '44%' }} />
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
              Lihat Hadiah
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
