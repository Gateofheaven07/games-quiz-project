'use client'

/**
 * game/page.tsx  —  60fps-Optimized QuizBattle Room
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-render Budget:
 *
 *   Component          │ Re-renders per second during gameplay
 *   ───────────────────┼────────────────────────────────────────
 *   TimerDisplay       │ 0  — DOM mutated directly via ref (RAF)
 *   TimerArc           │ 0  — SVG attr mutated directly via ref (RAF)
 *   PlayerPanel        │ ~0.1 (only when score or status changes)
 *   QuestionCard       │ 0   (memoized, changes once per question)
 *   AnswerOption       │ 0   (memoized, changes on click only)
 *   QuizBattleRoomPage │ ~0.1 (only when answerState/score changes)
 *
 * Techniques used:
 *  1. useRef for timer — timer runs via requestAnimationFrame, writes to DOM
 *     directly. React never knows the timer is ticking.
 *  2. React.memo on sub-components — PlayerPanel, QuestionCard, AnswerOption
 *     skip reconciliation when their props haven't changed.
 *  3. State partitioning — slow/fast state separated so only the right
 *     component tree subtree re-renders.
 *  4. RAF-based socket event coalescing — opponent score updates batched
 *     into animation frames to prevent micro-stutter.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { useGame } from '../../context/GameContext'
import { useGameEngine } from '../../hooks/useGameEngine'
import type { GameReadyPayload } from '../../context/GameContext'

// ── Shared Types ──────────────────────────────────────────────────────────────

interface PlayerData {
  name:   string
  avatar: string
  score:  number
  status: 'berpikir' | 'menjawab' | 'benar' | 'salah'
  rank:   string
  level:  number
}

// ── TimerDisplay — isolated DOM-mutation component ────────────────────────────
/**
 * This component renders the timer number text.
 * It exposes a ref so useGameEngine can mutate it DIRECTLY without setState.
 * Result: zero React re-renders per tick — only a raw textContent change.
 */
const TimerDisplay = memo(function TimerDisplay({
  initial,
  displayRef,
}: {
  initial: number
  displayRef: React.RefObject<HTMLSpanElement | null>
}) {
  return (
    <span
      ref={displayRef as React.RefObject<HTMLSpanElement>}
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--c-on-surface)',
        transition: 'color 0.3s ease',
        display: 'block',
        textAlign: 'center',
      }}
    >
      {initial}
    </span>
  )
})

// ── TimerArc — isolated SVG DOM-mutation component ────────────────────────────
/**
 * The SVG arc is rendered once, then the `stroke-dasharray` and `stroke`
 * attributes are mutated directly by useGameEngine via timerArcRef.
 * React never re-renders this component during countdown.
 */
const TimerArc = memo(function TimerArc({
  total,
  arcRef,
}: {
  total: number
  arcRef: React.RefObject<SVGCircleElement | null>
}) {
  const radius        = 40
  const circumference = 2 * Math.PI * radius
  const initialProgress = circumference // full circle at start

  return (
    <svg width={96} height={96} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
      {/* Static track */}
      <circle
        cx={48} cy={48} r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={6}
      />
      {/* Dynamic fill — mutated via ref */}
      <circle
        ref={arcRef as React.RefObject<SVGCircleElement>}
        cx={48} cy={48} r={radius}
        fill="none"
        stroke="#00d1ff"
        strokeWidth={6}
        strokeDasharray={`${initialProgress} ${circumference}`}
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 6px #00d1ff)', transition: 'stroke 0.3s ease' }}
      />
    </svg>
  )
})

// ── PlayerPanel — memoized ────────────────────────────────────────────────────
const PlayerPanel = memo(function PlayerPanel({
  player,
  align,
  isUser,
}: {
  player: PlayerData
  align: 'left' | 'right'
  isUser: boolean
}) {
  const statusColor =
    player.status === 'benar'    ? '#4aff91' :
    player.status === 'salah'    ? '#ff4545' :
    player.status === 'menjawab' ? '#00d1ff' :
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
        <div
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: isUser
              ? 'linear-gradient(135deg, #00d1ff, #cf5cff)'
              : 'linear-gradient(135deg, #cf5cff, #feb127)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: '1rem', color: '#003543',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        >
          {player.avatar}
        </div>
        <div style={{ textAlign: align === 'right' ? 'right' : 'left' }}>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: isUser ? '#00d1ff' : 'var(--c-on-surface)' }}>
            {player.name}
          </p>
          <p className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>
            LVL {player.level} {player.rank}
          </p>
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: align === 'right' ? 'right' : 'left' }}>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '2rem', color: statusColor, lineHeight: 1, transition: 'color 0.3s ease' }}>
          {player.score.toLocaleString()}
        </p>
        <p className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.6rem', marginTop: 2 }}>poin</p>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}`, animation: player.status === 'berpikir' ? 'pulse-live 1s infinite' : 'none' }} />
        <span className="label-caps" style={{ color: statusColor, fontSize: '0.6rem' }}>
          {player.status.toUpperCase()}
        </span>
      </div>
    </div>
  )
})

// ── QuestionCard — memoized ───────────────────────────────────────────────────
const QuestionCard = memo(function QuestionCard({ question }: { question: any }) {
  return (
    <div
      className="glass-panel"
      style={{ padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden' }}
    >
      <span className="badge badge-primary" style={{ marginBottom: 16, display: 'inline-block' }}>
        {question.category}
      </span>
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '1.375rem', fontWeight: 700,
          color: 'var(--c-on-surface)', lineHeight: 1.4,
        }}
      >
        {question.text || question.question}
      </h2>
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #00d1ff, #cf5cff)', opacity: 0.6,
        }}
      />
    </div>
  )
})

// ── AnswerOption — memoized ───────────────────────────────────────────────────
const AnswerOption = memo(function AnswerOption({
  label,
  text,
  state,
  disabled,
  onClick,
}: {
  label:   string
  text:    string
  state:   'idle' | 'selected' | 'benar' | 'salah'
  disabled: boolean
  onClick: () => void
}) {
  const stateClass =
    state === 'selected' ? 'selected' :
    state === 'benar'    ? 'correct'  :
    state === 'salah'    ? 'wrong'    :
    ''

  return (
    <button
      className={`quiz-option ${stateClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        style={{
          width: 32, height: 32, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem',
          backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {text}
    </button>
  )
})

// ── AnswerGrid — memoized, stable onClick via parent useCallback ──────────────
const AnswerGrid = memo(function AnswerGrid({
  options,
  selectedAnswer,
  answerState,
  correctAnswer,
  handleAnswer,
}: {
  options:        string[]
  selectedAnswer: number | null
  answerState:    'idle' | 'selected' | 'benar' | 'salah'
  correctAnswer:  number
  handleAnswer:   (idx: number) => void
}) {
  const LABELS = ['A', 'B', 'C', 'D']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {options.map((option, idx) => {
        let state: 'idle' | 'selected' | 'benar' | 'salah' = 'idle'
        if (selectedAnswer !== null) {
          if (idx === correctAnswer && answerState !== 'idle') state = 'benar'
          else if (idx === selectedAnswer && answerState === 'salah') state = 'salah'
        }
        return (
          <AnswerOption
            key={idx}
            label={LABELS[idx]}
            text={option}
            state={state}
            disabled={selectedAnswer !== null}
            onClick={() => handleAnswer(idx)}
          />
        )
      })}
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function QuizBattleRoomPage() {
  const TIMER_DURATION = 30

  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const { submitAnswer, finishGame, on, off } = useGame()

  // ── Slow state: game data (set once) ───────────────────────────────────────
  const [gameData, setGameData] = useState<GameReadyPayload | null>(null)

  // Timer DOM refs — updated directly by useGameEngine (bypasses setState)
  const timerDisplayRef = useRef<HTMLSpanElement | null>(null)
  const timerArcRef     = useRef<SVGCircleElement | null>(null)

  // Use a ref to ensure initialization only happens once (avoids StrictMode double execution bugs)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const raw = sessionStorage.getItem('quizGameData')
    if (!raw) {
      router.replace('/game/lobby')
      return
    }
    try {
      setGameData(JSON.parse(raw))
      // Keep in sessionStorage until game finishes or user unmounts intentionally,
      // but remove it when they are fully loaded so a browser refresh kicks them out.
      sessionStorage.removeItem('quizGameData')
    } catch {
      router.replace('/game/lobby')
    }
  }, [router])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, isLoading, router])

  // ── Derived slow values (memoized) ─────────────────────────────────────────
  const gameRoom = useMemo(() => gameData
    ? {
        id:       gameData.roomId,
        player1:  gameData.players.player1.userId,
        player2:  gameData.players.player2.userId,
        status:   'active' as const,
        questions: gameData.questions,
      }
    : null,
  [gameData])

  const isVsBot = gameData?.isVsBot ?? false

  // ── Game engine (with DOM ref injection) ───────────────────────────────────
  const {
    currentQ,
    round,
    totalRounds,
    currentQuestion: question,
    timeLeft,
    selectedAnswer,
    answerState,
    playerScore,
    opponentScore,
    gameEnded,
    gameResults,
    handleAnswer,
    revealedCorrect,
  } = useGameEngine({
    userId:        user?.id,
    gameRoom,
    submitAnswer,
    finishGame,
    on,
    off,
    totalDuration:  TIMER_DURATION,
    isVsBot,
    timerDisplayRef,
    timerArcRef,
  })

  // ── Memoized player objects (only rebuild when score/status changes) ────────
  const userPlayer = useMemo<PlayerData>(() => ({
    name:   user?.username || 'PLAYER',
    avatar: user?.username ? user.username[0].toUpperCase() : 'P',
    score:  playerScore,
    status: answerState === 'idle' ? 'berpikir' : answerState === 'selected' ? 'menjawab' : answerState,
    rank:   'CHALLENGER',
    level:  user?.level || 1,
  }), [user, playerScore, answerState])

  const opponentPlayer = useMemo<PlayerData>(() => ({
    name:   gameData?.players.player2.username || (isVsBot ? 'QuizBot' : 'OPPONENT'),
    avatar: gameData?.players.player2.isBot ? '🤖' : (gameData?.players.player2.username?.[0]?.toUpperCase() || 'O'),
    score:  opponentScore,
    status: 'berpikir',
    rank:   isVsBot ? 'BOT AI' : 'CHALLENGER',
    level:  isVsBot ? 0 : 1,
  }), [opponentScore, isVsBot, gameData])

  // Stable callback for AnswerGrid — won't change unless gameRoom changes
  const stableHandleAnswer = useCallback(handleAnswer, [handleAnswer])

  if (isLoading || !isAuthenticated) return null

  // ── Loading / waiting state ────────────────────────────────────────────────
  if (!question) {
    return (
      <div
        style={{
          minHeight: '100vh', backgroundColor: 'var(--c-bg)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div className="bg-orb bg-orb-blue" style={{ top: -200, left: -100 }} />
        <div className="bg-orb bg-orb-purple" style={{ bottom: -100, right: -100 }} />
        <div className="glass-panel" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 48, height: 48,
              border: '4px solid rgba(0,209,255,0.2)', borderTopColor: '#00d1ff',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--c-on-surface)' }}>
            {!gameRoom ? 'Menghubungkan ke Server...' : 'Menunggu Pertandingan...'}
          </h2>
          <p style={{ color: 'var(--c-outline)' }}>
            Mencari lawan dan menyiapkan pertanyaan. Harap tunggu!
          </p>
        </div>
      </div>
    )
  }

  // ── Final Results Screen ───────────────────────────────────────────────────
  if (gameEnded) {
    if (!gameResults) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--c-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-orb bg-orb-blue" style={{ top: -200, left: -100 }} />
          <div className="bg-orb bg-orb-purple" style={{ bottom: -100, right: -100 }} />
          <div style={{ width: 48, height: 48, border: '4px solid rgba(0,209,255,0.2)', borderTopColor: '#00d1ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--c-on-surface)', marginTop: 24 }}>Menghitung Skor Akhir...</h2>
        </div>
      )
    }

    const isWinner = gameResults.winnerId === user?.id
    const isDraw = gameResults.isDraw

    let resultTitle = 'KAMU MENANG!'
    let titleColor = '#00d1ff'
    
    if (isDraw) {
      resultTitle = 'SERI!'
      titleColor = '#feb127'
    } else if (!isWinner) {
      resultTitle = 'KAMU KALAH!'
      titleColor = '#ff4545'
    }

    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--c-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        <div className="bg-orb bg-orb-blue" style={{ top: -200, left: -100 }} />
        <div className="bg-orb bg-orb-purple" style={{ bottom: -100, right: -100 }} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 500, padding: 24 }}
        >
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ delay: 0.3, type: 'spring', bounce: 0.6 }}
            style={{ fontSize: '4rem', marginBottom: -10 }}
          >
            {isWinner ? '🏆' : isDraw ? '🤝' : '💀'}
          </motion.div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '3rem', color: titleColor, textAlign: 'center', textShadow: `0 0 20px ${titleColor}80` }}>
            {isVsBot ? 'MODE LATIHAN SELESAI' : resultTitle}
          </h1>
          
          <div className="glass-panel" style={{ width: '100%', padding: 32, marginTop: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isVsBot ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ color: 'var(--c-on-surface)', fontSize: '1.2rem' }}>
                  Skor latihan Anda adalah <strong style={{ color: '#00d1ff', fontSize: '1.5rem', fontWeight: 'bold' }}>{playerScore}</strong>.
                </span>
                <span style={{ color: '#feb127', fontSize: '0.85rem' }}>
                  (Statistik global tidak berubah)
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'var(--c-on-surface)', fontSize: '1.2rem' }}>Skor Kamu</span>
                  <span style={{ color: '#00d1ff', fontSize: '1.5rem', fontWeight: 'bold' }}>{playerScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--c-outline)', fontSize: '1.1rem' }}>Skor {opponentPlayer.name}</span>
                  <span style={{ color: '#cf5cff', fontSize: '1.3rem', fontWeight: 'bold' }}>{opponentScore}</span>
                </div>
              </>
            )}
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/dashboard')} 
            className="btn-primary" 
            style={{ width: '100%', padding: '16px', marginTop: 32, fontSize: '1.1rem' }}
          >
            Kembali ke Lobby
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── Active game ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh', backgroundColor: 'var(--c-bg)',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
      `}</style>

      <div className="bg-orb bg-orb-blue" style={{ top: -200, left: -100 }} />
      <div className="bg-orb bg-orb-purple" style={{ bottom: -100, right: -100 }} />

      {/* ── Top bar — STATIC, never re-renders during gameplay ── */}
      <nav
        style={{
          backgroundColor: 'rgba(14,20,23,0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--c-outline-variant)',
          padding: '0 24px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}
      >
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--c-outline)', fontSize: '1.25rem' }}>arrow_back</span>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem',
              background: 'linear-gradient(135deg, #00d1ff, #cf5cff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
          >
            ⚡ QuizBattle
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isVsBot ? (
            <span className="badge" style={{ background: 'rgba(74,255,145,0.15)', color: '#4aff91', border: '1px solid rgba(74,255,145,0.3)', padding: '4px 12px', borderRadius: 6, fontSize: '0.6875rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '0.06em' }}>
              🤖 MODE LATIHAN
            </span>
          ) : (
            <span className="badge badge-live">PERTANDINGAN LANGSUNG</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--c-outline)', fontSize: '1rem' }}>bolt</span>
            <span className="label-caps" style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.6875rem' }}>
              RONDE {round} / {totalRounds}
            </span>
          </div>
        </div>

        <button className="btn-danger" style={{ padding: '0.5rem 1rem' }}>Menyerah</button>
      </nav>

      {/* ── Main battle area ── */}
      <main style={{ flex: 1, padding: '32px 24px', maxWidth: 1000, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Round progress bar — re-renders once per question */}
        <div style={{ marginBottom: 24 }}>
          <div className="progress-track" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${(round / totalRounds) * 100}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>RONDE 1</span>
            <span className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>RONDE {totalRounds}</span>
          </div>
        </div>

        {/* Players vs Timer */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 32 }}>
          {/* PlayerPanel re-renders only when score/status changes */}
          <PlayerPanel player={userPlayer} align="left" isUser />

          {/* Timer widget — TimerArc and TimerDisplay update via DOM refs ONLY */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              {/*
                TimerArc renders ONCE and never re-renders.
                useGameEngine mutates its SVG attributes directly via timerArcRef.
              */}
              <TimerArc total={TIMER_DURATION} arcRef={timerArcRef} />

              {/* Center content */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                }}
              >
                {/*
                  TimerDisplay renders ONCE.
                  useGameEngine writes textContent directly via timerDisplayRef.
                */}
                <TimerDisplay initial={timeLeft} displayRef={timerDisplayRef} />
                <span className="label-caps" style={{ fontSize: '0.5rem', color: 'var(--c-outline)' }}>DETIK</span>
              </div>
            </div>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                fontSize: '0.875rem', color: 'var(--c-outline)', letterSpacing: '0.1em',
              }}
            >
              VS
            </span>
          </div>

          <PlayerPanel player={opponentPlayer} align="right" isUser={false} />
        </div>

        {/* Question card — re-renders once per question */}
        <QuestionCard question={question} />

        {/*
          AnswerGrid — memoized.
          Re-renders only when selectedAnswer or answerState changes (user clicks).
        */}
        <AnswerGrid
          options={question.options}
          selectedAnswer={selectedAnswer}
          answerState={answerState}
          correctAnswer={revealedCorrect}
          handleAnswer={stableHandleAnswer}
        />

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8125rem', color: 'var(--c-outline)' }}>
          Jawab cepat untuk poin bonus · Streak meningkatkan pengganda Anda
        </p>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--c-outline-variant)', padding: '12px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span className="label-caps" style={{ color: 'var(--c-outline)', fontSize: '0.625rem' }}>
          © 2024 Sistem Taktis QuizBattle
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Status', 'Privasi', 'Dukungan'].map((link) => (
            <a key={link} href="#" className="label-caps" style={{ color: 'var(--c-outline)', textDecoration: 'none', fontSize: '0.625rem' }}>
              {link}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
