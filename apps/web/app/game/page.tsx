'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

// ── Types ────────────────────────────────────────────────────────────────────
interface Player {
  name: string
  avatar: string
  score: number
  status: 'thinking' | 'answered' | 'correct' | 'wrong'
  rank: string
  level: number
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    question: 'Which subatomic particle is responsible for the phenomenon of Quantum Entanglement?',
    options: ['Photon', 'Electron', 'Quark', 'Neutrino'],
    correct: 0,
    category: 'QUANTUM PHYSICS',
  },
  {
    question: 'What is the time complexity of QuickSort in the average case?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
    correct: 1,
    category: 'COMPUTER SCIENCE',
  },
  {
    question: 'Which programming language was designed by Guido van Rossum?',
    options: ['Ruby', 'Java', 'Python', 'Go'],
    correct: 2,
    category: 'PROGRAMMING',
  },
]

const TOTAL_ROUNDS = 12

// ── Mini component: Timer arc ────────────────────────────────────────────────
function TimerArc({ seconds, total }: { seconds: number; total: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = (seconds / total) * circumference
  const color = seconds > total * 0.5 ? '#00d1ff' : seconds > total * 0.25 ? '#feb127' : '#ff4545'

  return (
    <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx={48} cy={48} r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={6}
      />
      {/* Fill */}
      <circle
        cx={48} cy={48} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 0.5s linear, stroke 0.3s ease' }}
      />
    </svg>
  )
}

// ── Player panel ────────────────────────────────────────────────────────────
function PlayerPanel({
  player,
  align,
  isUser,
}: {
  player: Player
  align: 'left' | 'right'
  isUser: boolean
}) {
  const statusColor =
    player.status === 'correct' ? '#4aff91' :
    player.status === 'wrong'   ? '#ff4545' :
    player.status === 'answered'? '#00d1ff' :
    'var(--c-on-surface-variant)'

  return (
    <div
      className="glass-panel"
      style={{
        flex: 1,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        border: isUser ? '1px solid rgba(0,209,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isUser ? '0 0 24px rgba(0,209,255,0.12)' : 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {/* Avatar */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isUser
              ? 'linear-gradient(135deg, #00d1ff, #cf5cff)'
              : 'linear-gradient(135deg, #cf5cff, #feb127)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '1rem',
            color: '#003543',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        >
          {player.avatar}
        </div>

        <div style={{ textAlign: align === 'right' ? 'right' : 'left' }}>
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '0.9375rem',
              color: isUser ? '#00d1ff' : 'var(--c-on-surface)',
            }}
          >
            {player.name}
          </p>
          <p className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>
            LVL {player.level} {player.rank}
          </p>
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: align === 'right' ? 'right' : 'left' }}>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '2rem',
            color: statusColor,
            lineHeight: 1,
            transition: 'color 0.3s ease',
          }}
        >
          {player.score.toLocaleString()}
        </p>
        <p className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.6rem', marginTop: 2 }}>pts</p>
      </div>

      {/* Status indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: 6,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
            animation: player.status === 'thinking' ? 'pulse-live 1s infinite' : 'none',
          }}
        />
        <span className="label-caps" style={{ color: statusColor, fontSize: '0.6rem' }}>
          {player.status.toUpperCase()}
        </span>
      </div>
    </div>
  )
}

// ── Answer option ─────────────────────────────────────────────────────────────
function AnswerOption({
  label,
  text,
  state,
  onClick,
}: {
  label: string
  text: string
  state: 'idle' | 'selected' | 'correct' | 'wrong'
  onClick: () => void
}) {
  const stateClass =
    state === 'selected' ? 'selected' :
    state === 'correct'  ? 'correct' :
    state === 'wrong'    ? 'wrong' :
    ''

  return (
    <button
      className={`quiz-option ${stateClass}`}
      onClick={onClick}
      disabled={state !== 'idle'}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: '0.875rem',
          backgroundColor: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {text}
    </button>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function QuizBattleRoomPage() {
  const TIMER_DURATION = 30
  
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  const [currentQ, setCurrentQ] = useState(0)
  const [round, setRound] = useState(7)
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answerState, setAnswerState] = useState<'idle' | 'selected' | 'correct' | 'wrong'>('idle')
  
  const userPlayer = useMemo<Player>(() => ({
    name: user?.username || 'OPERATOR_01',
    avatar: user?.username ? user.username[0].toUpperCase() : 'O1',
    score: 1240,
    status: 'thinking',
    rank: 'TACTICIAN',
    level: user?.level || 42,
  }), [user])
  const [opponent] = useState<Player>({
    name: 'VOID_WALKER',
    avatar: 'VW',
    score: 980,
    status: 'thinking',
    rank: 'HUNTER',
    level: 38,
  })

  const question = QUESTIONS[currentQ % QUESTIONS.length]

  const handleAnswer = useCallback((idx: number) => {
    if (answerState !== 'idle') return
    setSelectedAnswer(idx)
    if (idx === question.correct) {
      setAnswerState('correct')
    } else {
      setAnswerState('wrong')
    }
    // advance after short delay
    setTimeout(() => {
      setCurrentQ((q) => q + 1)
      setRound((r) => Math.min(r + 1, TOTAL_ROUNDS))
      setTimeLeft(TIMER_DURATION)
      setSelectedAnswer(null)
      setAnswerState('idle')
    }, 1800)
  }, [answerState, question.correct])

  // countdown
  useEffect(() => {
    if (answerState !== 'idle') return
    if (timeLeft <= 0) {
      handleAnswer(-1)
      return
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [timeLeft, answerState, handleAnswer])

  const optionLabels = ['A', 'B', 'C', 'D']

  if (isLoading || !isAuthenticated) return null

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--c-bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Font / icon imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
      `}</style>

      {/* Background orbs */}
      <div className="bg-orb bg-orb-blue" style={{ top: -200, left: -100 }} />
      <div className="bg-orb bg-orb-purple" style={{ bottom: -100, right: -100 }} />

      {/* ── Top navigation bar ── */}
      <nav
        style={{
          backgroundColor: 'rgba(14,20,23,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--c-outline-variant)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--c-outline)', fontSize: '1.25rem' }}>arrow_back</span>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '1.25rem',
              background: 'linear-gradient(135deg, #00d1ff, #cf5cff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ⚡ QuizBattle
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="badge badge-live">LIVE MATCH</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--c-outline)', fontSize: '1rem' }}>bolt</span>
            <span className="label-caps" style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.6875rem' }}>
              ROUND {round} / {TOTAL_ROUNDS}
            </span>
          </div>
        </div>

        <button className="btn-danger" style={{ padding: '0.5rem 1rem' }}>
          Surrender
        </button>
      </nav>

      {/* ── Main battle layout ── */}
      <main style={{ flex: 1, padding: '32px 24px', maxWidth: 1000, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Round progress */}
        <div style={{ marginBottom: 24 }}>
          <div className="progress-track" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${(round / TOTAL_ROUNDS) * 100}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>ROUND 1</span>
            <span className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>ROUND {TOTAL_ROUNDS}</span>
          </div>
        </div>

        {/* Players vs section */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 32 }}>
          <PlayerPanel player={userPlayer} align="left" isUser />

          {/* VS / Timer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <TimerArc seconds={timeLeft} total={TIMER_DURATION} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: timeLeft <= 5 ? '#ff4545' : 'var(--c-on-surface)',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {timeLeft}
                </span>
                <span className="label-caps" style={{ fontSize: '0.5rem', color: 'var(--c-outline)' }}>SEC</span>
              </div>
            </div>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: '0.875rem',
                color: 'var(--c-outline)',
                letterSpacing: '0.1em',
              }}
            >
              VS
            </span>
          </div>

          <PlayerPanel player={opponent} align="right" isUser={false} />
        </div>

        {/* Question card */}
        <div
          className="glass-panel"
          style={{
            padding: 32,
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Category badge */}
          <span className="badge badge-primary" style={{ marginBottom: 16, display: 'inline-block' }}>
            {question.category}
          </span>

          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--c-on-surface)',
              lineHeight: 1.4,
            }}
          >
            {question.question}
          </h2>

          {/* Decorative lines */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #00d1ff, #cf5cff)',
              opacity: 0.6,
            }}
          />
        </div>

        {/* Answer options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {question.options.map((option, idx) => {
            let state: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle'
            if (selectedAnswer !== null) {
              if (idx === question.correct && answerState !== 'idle') state = 'correct'
              else if (idx === selectedAnswer && answerState === 'wrong') state = 'wrong'
            }
            return (
              <AnswerOption
                key={idx}
                label={optionLabels[idx]}
                text={option}
                state={state}
                onClick={() => handleAnswer(idx)}
              />
            )
          })}
        </div>

        {/* Footer hint */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: '0.8125rem',
            color: 'var(--c-outline)',
          }}
        >
          Answer quickly for bonus points · Streak boosts your multiplier
        </p>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--c-outline-variant)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>
          © 2024 QuizBattle Tactical Systems
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Status', 'Privacy', 'Support'].map((link) => (
            <a
              key={link}
              href="#"
              className="label-caps"
              style={{ color: 'var(--c-outline)', textDecoration: 'none', fontSize: '0.625rem' }}
            >
              {link}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
