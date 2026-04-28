'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  const router = useRouter()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const navItems = [
    { icon: 'dashboard',      label: 'Dashboard',     href: '/dashboard' },
    { icon: 'swords',         label: 'Battle Arena',  href: '/game' },
    { icon: 'sports_esports', label: 'Arcade',        href: '/game/crossword' },
    { icon: 'leaderboard',    label: 'Rankings',      href: '/leaderboard' },
    { icon: 'person',         label: 'Profile',       href: '/profile' },
  ]

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        backgroundColor: 'var(--c-surface-low)',
        borderRight: '1px solid var(--c-outline-variant)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: 8,
      }}
    >
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
          Tactical Game Arena
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
          <span className="badge badge-gold" style={{ marginTop: 2 }}>GOLD RANK</span>
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
        Settings
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
        Log Out
      </button>
    </aside>
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
          PLAY NOW
          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>arrow_forward</span>
        </div>
      </div>
    </Link>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
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
      <p className="label-caps" style={{ color: 'var(--c-on-surface-variant)', marginBottom: 8 }}>{label}</p>
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
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--c-bg)', position: 'relative' }}>
      {/* Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
      `}</style>

      {/* Background orbs */}
      <div className="bg-orb bg-orb-blue" style={{ top: -100, left: 200 }} />
      <div className="bg-orb bg-orb-purple" style={{ bottom: 0, right: 100 }} />

      {/* Sidebar */}
      <Sidebar active="Dashboard" />

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 32, position: 'relative', zIndex: 1 }}>

        {/* Welcome header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <p className="label-caps" style={{ color: 'var(--c-primary-container)', marginBottom: 4 }}>
                ⚡ Welcome back
              </p>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--c-on-surface)',
                  letterSpacing: '-0.01em',
                }}
              >
                {user?.username || 'OPERATOR_01'}
              </h2>
              <p style={{ color: 'var(--c-on-surface-variant)', marginTop: 4, fontSize: '0.9375rem' }}>
                Your combat efficiency is up{' '}
                <span style={{ color: '#4aff91', fontWeight: 600 }}>+12%</span> this week. Ready for the next engagement?
              </p>
            </div>
            <button className="btn-primary" style={{ gap: 8 }}>
              <span className="material-symbols-rounded">swords</span>
              Quick Battle
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard
            label="Battle Score"
            value="12,450"
            sub="750 XP to next rank"
            accent="#00d1ff"
          />
          <StatCard
            label="Win Rate"
            value="68%"
            sub="Elite Tier Status"
            accent="#cf5cff"
          />
          <StatCard
            label="Games Played"
            value="384"
            sub="This season"
            accent="#ffd59c"
          />
        </div>

        {/* Game Modes */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'var(--c-on-surface)',
              }}
            >
              Game Modes
            </h3>
            <span className="badge badge-live">3 Active Rooms</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <GameModeCard
              icon="swords"
              title="Quiz Battle"
              description="Live 1v1 tactical trivia combat. Destroy your opponent's core with knowledge."
              href="/game"
              badge="LIVE"
              accent="#00d1ff"
            />
            <GameModeCard
              icon="grid_view"
              title="Crossword"
              description="Solve tactical word grids to unlock encrypted weapon skins and bonus XP."
              href="/game/crossword"
              accent="#cf5cff"
            />
            <GameModeCard
              icon="view_comfy_alt"
              title="Tetris"
              description="High-speed spatial reasoning. Stack, clear, and dominate the arena."
              href="/game/tetris"
              accent="#feb127"
            />
          </div>
        </div>

        {/* Bottom row: leaderboard + battle pass */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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
                Weekly Top Players
              </h3>
              <Link
                href="/leaderboard"
                className="label-caps"
                style={{ color: 'var(--c-primary-container)', textDecoration: 'none', fontSize: '0.6875rem' }}
              >
                View All →
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
                    {player.wins} wins
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
              Unlock the legendary{' '}
              <span style={{ color: '#cf5cff', fontWeight: 600 }}>'Glitch Protocol'</span>{' '}
              skin at Tier 50.
            </p>

            {/* Progress */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="label-caps" style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.6875rem' }}>Progress</span>
                <span className="label-caps" style={{ color: 'var(--c-primary-container)', fontSize: '0.6875rem' }}>TIER 22/50</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '44%' }} />
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
              View Rewards
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
