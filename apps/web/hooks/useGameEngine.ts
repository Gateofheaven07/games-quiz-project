/**
 * useGameEngine.ts  —  Optimized for 60fps & Predictable State
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * State Partitioning & Logic Separation
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  FAST STATE  (Timer)
 *  — Stored in useRef, pushed to DOM via RAF (Zero React re-renders per tick)
 *
 *  MEDIUM & SLOW STATE (Reducer)
 *  — Managed via useReducer for predictable logic separation (Visual vs Data).
 *
 *  Optimistic UI:
 *  — When user clicks an answer, state updates instantly (color + score).
 */

import { useEffect, useCallback, useRef, useReducer } from 'react';
import { useRouter } from 'next/navigation';

interface UseGameEngineProps {
  userId?:        string;
  gameRoom:       any;
  submitAnswer:   (answer: number, questionIndex: number) => void;
  finishGame:     () => void;
  on:             (event: string, callback: (...args: any[]) => void) => void;
  off:            (event: string, callback: (...args: any[]) => void) => void;
  totalDuration?: number;
  isVsBot?:       boolean;
  timerDisplayRef?: React.RefObject<HTMLElement | null>;
  timerArcRef?:     React.RefObject<SVGCircleElement | null>;
}

export type GameStatus = 'IDLE' | 'INITIALIZING_BOARD' | 'PLAYING' | 'GAME_OVER';

export interface GameEngineReturn {
  currentQ:        number;
  round:           number;
  totalRounds:     number;
  currentQuestion: any;
  timeLeft:        number; // initial render only
  selectedAnswer:  number | null;
  answerState:     'idle' | 'selected' | 'benar' | 'salah';
  playerScore:     number;
  opponentScore:   number;
  status:          GameStatus;
  gameResults:     any | null;
  revealedCorrect: number;
  handleAnswer:    (idx: number) => void;
}

// ── Reducer Setup ────────────────────────────────────────────────────────────

type GameState = {
  currentQ: number;
  selectedAnswer: number | null;
  answerState: 'idle' | 'selected' | 'benar' | 'salah';
  playerScore: number;
  opponentScore: number;
  status: GameStatus;
  gameResults: any | null;
  revealedCorrect: number;
};

type Action =
  | { type: 'START_GAME' }
  | { type: 'ANSWER_SUBMITTED'; payload: { answer: number; isCorrect: boolean; correctAnswer: number; scoreEarned: number } }
  | { type: 'OPPONENT_ANSWERED'; payload: { scoreEarned: number } }
  | { type: 'NEXT_QUESTION'; payload: { totalRounds: number } }
  | { type: 'GAME_OVER'; payload?: any };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, status: 'PLAYING' };

    case 'ANSWER_SUBMITTED':
      // Optimistic UI: Update both Visual (colors) and Data (score) instantly
      return {
        ...state,
        selectedAnswer: action.payload.answer,
        answerState: action.payload.isCorrect ? 'benar' : 'salah',
        revealedCorrect: action.payload.correctAnswer,
        playerScore: state.playerScore + action.payload.scoreEarned,
      };

    case 'OPPONENT_ANSWERED':
      return {
        ...state,
        opponentScore: state.opponentScore + action.payload.scoreEarned,
      };

    case 'NEXT_QUESTION':
      return {
        ...state,
        currentQ: Math.min(state.currentQ + 1, action.payload.totalRounds - 1),
        selectedAnswer: null,
        answerState: 'idle',
        revealedCorrect: -1,
      };

    case 'GAME_OVER':
      // STRICT TRANSITION VALIDATION: Only allow GAME_OVER from PLAYING
      if (state.status !== 'PLAYING') {
        console.warn(`[FSM] Invalid transition attempt: ${state.status} -> GAME_OVER. Rejected.`);
        return state;
      }
      return {
        ...state,
        status: 'GAME_OVER',
        gameResults: action.payload || state.gameResults,
      };

    default:
      return state;
  }
}

const initialState: GameState = {
  currentQ: 0,
  selectedAnswer: null,
  answerState: 'idle',
  playerScore: 0,
  opponentScore: 0,
  status: 'INITIALIZING_BOARD',
  gameResults: null,
  revealedCorrect: -1,
};

// ─────────────────────────────────────────────────────────────────────────────

export function useGameEngine({
  userId,
  gameRoom,
  submitAnswer,
  finishGame,
  on,
  off,
  totalDuration   = 30,
  isVsBot         = false,
  timerDisplayRef,
  timerArcRef,
}: UseGameEngineProps): GameEngineReturn {
  const router = useRouter();

  // UseReducer manages all core game state predictively
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Fast state — timer stored in useRef
  const timeLeftRef = useRef(totalDuration);
  const gameEndedRef = useRef(false);

  // Transition from INITIALIZING_BOARD to PLAYING when gameRoom is ready
  useEffect(() => {
    if (gameRoom && state.status === 'INITIALIZING_BOARD') {
      dispatch({ type: 'START_GAME' });
    }
  }, [gameRoom, state.status]);

  // Throttle ref for opponent answers
  const opponentAnswerPendingRef = useRef(false);

  const totalRounds     = gameRoom?.questions?.length || 10;
  const round           = Math.min(state.currentQ + 1, totalRounds);
  const currentQuestion = gameRoom?.questions?.[state.currentQ];

  // ── DOM mutation helper (bypasses React reconciler) ────────────────────────
  const updateTimerDOM = useCallback((seconds: number) => {
    if (timerDisplayRef?.current) {
      timerDisplayRef.current.textContent = String(seconds);
      const color = seconds <= 5 ? '#ff4545' : 'var(--c-on-surface)';
      (timerDisplayRef.current as HTMLElement).style.color = color;
    }
    if (timerArcRef?.current) {
      const radius        = 40;
      const circumference = 2 * Math.PI * radius;
      const progress      = (seconds / totalDuration) * circumference;
      timerArcRef.current.setAttribute('stroke-dasharray', `${progress} ${circumference}`);

      const arcColor = seconds > totalDuration * 0.5 ? '#00d1ff'
                     : seconds > totalDuration * 0.25 ? '#feb127'
                     : '#ff4545';
      timerArcRef.current.setAttribute('stroke', arcColor);
      timerArcRef.current.style.filter = `drop-shadow(0 0 6px ${arcColor})`;
    }
  }, [timerDisplayRef, timerArcRef, totalDuration]);

  // ── Timer: RAF-based countdown (zero React re-renders) ─────────────────────
  useEffect(() => {
    if (state.status !== 'PLAYING' || gameEndedRef.current) return;

    let rafId:       number;
    let lastTick:    number = performance.now();

    const tick = (now: number) => {
      if (gameEndedRef.current) return;

      const elapsed = now - lastTick;
      if (elapsed >= 1000) {
        lastTick = now - (elapsed % 1000);
        timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
        updateTimerDOM(timeLeftRef.current);

        if (timeLeftRef.current <= 0) {
          gameEndedRef.current = true;
          dispatch({ type: 'GAME_OVER' });
          finishGame();
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [gameRoom?.status, updateTimerDOM]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const handlePlayerAnswered = (data: any) => {
      if (data.userId === userId) return; // Ignored: own event
      if (opponentAnswerPendingRef.current) return;
      
      opponentAnswerPendingRef.current = true;
      requestAnimationFrame(() => {
        dispatch({ type: 'OPPONENT_ANSWERED', payload: { scoreEarned: data.scoreEarned || 0 } });
        opponentAnswerPendingRef.current = false;
      });
    };

    const handleGameFinished = (data: any) => {
      gameEndedRef.current = true;
      dispatch({ type: 'GAME_OVER', payload: data });
    };

    // Note: We ignore game:answer_result here because Optimistic UI handles it instantly!
    on('game:player_answered', handlePlayerAnswered);
    on('game:finished',        handleGameFinished);

    return () => {
      off('game:player_answered', handlePlayerAnswered);
      off('game:finished',        handleGameFinished);
    };
  }, [on, off, userId, router, isVsBot]);

  // ── Graceful Fallback for Results (Offline-first) ─────────────────────────
  useEffect(() => {
    if (state.status === 'GAME_OVER' && !state.gameResults) {
      const fallbackTimer = setTimeout(() => {
        console.warn('[GameEngine] Server timeout. Using local fallback for game results.');
        
        let winnerId: string | null = null;
        let isDraw = false;

        if (state.playerScore > state.opponentScore) winnerId = userId || null;
        else if (state.opponentScore > state.playerScore) winnerId = 'opponent';
        else isDraw = true;

        const fallbackData = {
          message: 'Skor Lokal (Server Terputus)',
          results: {
            p1: { userId, score: state.playerScore, isWinner: winnerId === userId, isDraw },
            p2: { score: state.opponentScore, isWinner: winnerId === 'opponent', isDraw },
          },
          winnerId,
          isDraw,
        };
        dispatch({ type: 'GAME_OVER', payload: fallbackData });
      }, 5000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [state.status, state.gameResults, state.playerScore, state.opponentScore, userId]);

  // ── Answer handler (Optimistic UI) ─────────────────────────────────────────
  const handleAnswer = useCallback(
    (idx: number) => {
      if (state.answerState !== 'idle' || !gameRoom) return;

      const question = gameRoom.questions[state.currentQ];
      const isCorrect = question.correctAnswer === idx;
      const scoreEarned = isCorrect ? 10 : 0;

      // 1. Instantly update UI (Optimistic UI)
      dispatch({
        type: 'ANSWER_SUBMITTED',
        payload: { answer: idx, isCorrect, correctAnswer: question.correctAnswer, scoreEarned }
      });

      // 2. Send to server (Fire and forget, server will broadcast to opponent)
      submitAnswer(idx, state.currentQ);

      // 3. Setup transition to next question after visual delay
      setTimeout(() => {
        if (gameEndedRef.current) return;
        
        if (state.currentQ === totalRounds - 1) {
          // Last question answered! Stop timer and tell server we are done.
          gameEndedRef.current = true;
          dispatch({ type: 'GAME_OVER' });
          finishGame();
          return;
        }

        // Reset timer
        timeLeftRef.current = totalDuration;
        updateTimerDOM(totalDuration);

        // Move to next question and cleanup UI state
        dispatch({ type: 'NEXT_QUESTION', payload: { totalRounds } });
      }, 1500);
    },
    [state.answerState, state.currentQ, gameRoom, submitAnswer, finishGame, totalRounds, totalDuration, updateTimerDOM]
  );

  return {
    currentQ: state.currentQ,
    round,
    totalRounds,
    currentQuestion,
    timeLeft: timeLeftRef.current, // Returns the current ref value for initial render
    selectedAnswer: state.selectedAnswer,
    answerState: state.answerState,
    playerScore: state.playerScore,
    opponentScore: state.opponentScore,
    status: state.status,
    gameResults: state.gameResults,
    revealedCorrect: state.revealedCorrect,
    handleAnswer,
  };
}
