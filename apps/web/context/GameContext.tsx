'use client';

/**
 * GameContext.tsx
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * State Isolation Architecture
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UI HANYA mendengarkan `GameState`. GameState ini diupdate oleh:
 *   • SocketService  — jika mode multiplayer
 *   • BotService     — jika mode vs Bot (sinyal datang dari server melalui socket
 *                       yang SAMA, tapi tanpa berjalan bersamaan)
 *
 * Koneksi socket dikelola oleh socketSingleton.ts agar tidak putus saat
 * perpindahan rute (router.push).
 *
 * Diagram aliran:
 *
 *   [LobbyPage] ──emit──► [Server]
 *       │                    │
 *       │                    ▼
 *       │              matchmaking:game_ready
 *       │                    │
 *       ▼                    ▼
 *   [GameContext] ◄──────[socket.on event]
 *       │
 *       ▼
 *   [GamePage / useGameEngine] — hanya baca GameState
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, destroySocket } from '../lib/socketSingleton';
import { useAuth } from '../hooks/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export const BOT_DIFFICULTY_INFO = {
  EASY:   { label: 'Mudah',  emoji: '🟢', description: 'Akurasi 40%, respons 5–8 detik' },
  MEDIUM: { label: 'Sedang', emoji: '🟡', description: 'Akurasi 65%, respons 3–5 detik' },
  HARD:   { label: 'Sulit',  emoji: '🔴', description: 'Akurasi 90%, respons 1–3 detik' },
} as const;

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: string;
}

export interface PlayerInfo {
  userId:   string;
  username: string;
  isBot?:   boolean;
}

export interface GameReadyPayload {
  roomId:     string;
  categoryId: number;
  questions:  Question[];
  isVsBot?:   boolean;
  difficulty?: BotDifficulty;
  players: {
    player1: PlayerInfo;
    player2: PlayerInfo;
  };
}

export type MatchmakingStatus =
  | 'IDLE'
  | 'MATCHMAKING_OR_WAITING'
  | 'INITIALIZING_BOARD'
  | 'PLAYING'
  | 'GAME_OVER'
  | 'ERROR';

// ── Context shape ─────────────────────────────────────────────────────────────

interface GameContextValue {
  // Connection
  isConnected:        boolean;
  socket:             Socket | null;

  // Matchmaking state (read-only for UI)
  matchmakingStatus:  MatchmakingStatus;
  matchmakingError:   string | null;
  gameData:           GameReadyPayload | null;
  opponentInfo:       PlayerInfo | null;
  privateRoomCode:    string | null;

  // Matchmaking actions
  findRandomMatch:    (categoryId: number) => void;
  findBotMatch:       (categoryId: number, difficulty: BotDifficulty) => void;
  cancelMatchmaking:  () => void;
  createInviteRoom:   (categoryId: number) => void;
  joinByCode:         (roomCode: string) => void;
  resetMatchmaking:   () => void;

  // Gameplay actions
  submitAnswer:       (answer: number, questionIndex: number) => void;
  finishGame:         () => void;

  // Generic event helpers for useGameEngine
  on:                 (event: string, handler: (...args: any[]) => void) => void;
  off:                (event: string, handler: (...args: any[]) => void) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [isConnected,       setIsConnected]       = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<MatchmakingStatus>('IDLE');
  const [matchmakingError,  setMatchmakingError]  = useState<string | null>(null);
  const [gameData,          setGameData]           = useState<GameReadyPayload | null>(null);
  const [opponentInfo,      setOpponentInfo]       = useState<PlayerInfo | null>(null);
  const [privateRoomCode,   setPrivateRoomCode]    = useState<string | null>(null);

  // ── Setup socket listeners (idempotent) ────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket(null);
      return;
    }

    // Gunakan singleton — tidak membuat koneksi baru jika sudah ada
    const s = getSocket(token);
    socketRef.current = s;
    setSocket(s);

    // Sync state dengan kondisi socket saat ini
    setIsConnected(s.connected);
    setMatchmakingStatus('IDLE');

    // ── Core events ─────────────────────────────────────────────────────────
    const onConnect = () => {
      console.log('[GameContext] Socket connected:', s.id);
      setIsConnected(true);
      setMatchmakingStatus('IDLE');
    };

    const onConnectionSuccess = (data: any) => {
      console.log('[GameContext] Handshake confirmed:', data);
      setMatchmakingStatus('IDLE');
    };

    const onDisconnect = (reason: string) => {
      // console.trace dipasang di socketSingleton — tidak perlu duplikasi di sini
      console.warn('[GameContext] Socket disconnected. Reason:', reason);
      setIsConnected(false);
      // Jangan reset matchmaking status di sini — bisa jadi reconnect otomatis
    };

    const onConnectError = (err: Error) => {
      console.error('[GameContext] Connection error:', err.message);
      setMatchmakingStatus('ERROR');
      setMatchmakingError(`Tidak dapat terhubung ke server: ${err.message}`);
    };

    // ── Matchmaking events ───────────────────────────────────────────────────
    const onSearching = () => {
      console.log('[GameContext] Matchmaking: searching…');
      setMatchmakingStatus('MATCHMAKING_OR_WAITING');
    };

    const onOpponentFound = (data: { opponentId: string; opponentUsername: string; isBot?: boolean }) => {
      console.log('[GameContext] Opponent found:', data);
      setOpponentInfo({ userId: data.opponentId, username: data.opponentUsername, isBot: data.isBot });
      setMatchmakingStatus('MATCHMAKING_OR_WAITING');
    };

    const onPreparing = (data: { roomId: string; message: string }) => {
      console.log('[GameContext] Preparing:', data.message);
      setMatchmakingStatus('INITIALIZING_BOARD');
    };

    const onGameReady = (data: GameReadyPayload) => {
      console.log('[GameContext] Game ready:', data.roomId, '| isVsBot:', data.isVsBot);
      setGameData(data);
      setMatchmakingStatus('PLAYING');
    };

    const onRoomCreated = (data: { roomId: string; roomCode: string }) => {
      console.log('[GameContext] Private room created:', data.roomCode);
      setPrivateRoomCode(data.roomCode);
      setMatchmakingStatus('MATCHMAKING_OR_WAITING');
    };

    const onCancelled = () => setMatchmakingStatus('IDLE');

    const onMatchmakingError = (data: { message: string }) => {
      console.error('[GameContext] Matchmaking error:', data.message);
      setMatchmakingStatus('ERROR');
      setMatchmakingError(data.message);
    };

    const onRoomNotFound = (data: { roomCode: string }) => {
      setMatchmakingStatus('ERROR');
      setMatchmakingError(`Room dengan kode "${data.roomCode}" tidak ditemukan.`);
    };

    // Daftarkan semua listener
    s.on('connect',                    onConnect);
    s.on('connection_success',         onConnectionSuccess);
    s.on('disconnect',                 onDisconnect);
    s.on('connect_error',              onConnectError);
    s.on('matchmaking:searching',      onSearching);
    s.on('matchmaking:opponent_found', onOpponentFound);
    s.on('matchmaking:preparing',      onPreparing);
    s.on('matchmaking:game_ready',     onGameReady);
    s.on('matchmaking:room_created',   onRoomCreated);
    s.on('matchmaking:cancelled',      onCancelled);
    s.on('matchmaking:error',          onMatchmakingError);
    s.on('matchmaking:room_not_found', onRoomNotFound);

    // Cleanup: HANYA lepas listener — JANGAN disconnect socket!
    // Socket singleton hanya diputus saat logout.
    return () => {
      s.off('connect',                    onConnect);
      s.off('connection_success',         onConnectionSuccess);
      s.off('disconnect',                 onDisconnect);
      s.off('connect_error',              onConnectError);
      s.off('matchmaking:searching',      onSearching);
      s.off('matchmaking:opponent_found', onOpponentFound);
      s.off('matchmaking:preparing',      onPreparing);
      s.off('matchmaking:game_ready',     onGameReady);
      s.off('matchmaking:room_created',   onRoomCreated);
      s.off('matchmaking:cancelled',      onCancelled);
      s.off('matchmaking:error',          onMatchmakingError);
      s.off('matchmaking:room_not_found', onRoomNotFound);
    };
  }, [isAuthenticated, token]);

  // ── Matchmaking actions ────────────────────────────────────────────────────

  const findRandomMatch = useCallback((categoryId: number) => {
    const s = socketRef.current;
    if (!s?.connected) return;
    setMatchmakingError(null);
    s.emit('matchmaking:find', { categoryId });
  }, []);

  /**
   * findBotMatch
   *
   * Bot Mode Silence: emit `toggle_presence` ke server SEBELUM mulai agar
   * server tahu user sedang busy dan tidak dimasukkan ke antrian matchmaking
   * publik — TANPA memutus socket.
   */
  const findBotMatch = useCallback((categoryId: number, difficulty: BotDifficulty) => {
    const s = socketRef.current;
    if (!s?.connected) return;
    setMatchmakingError(null);

    // Beritahu server: user busy, jangan masukkan ke antrian publik
    s.emit('toggle_presence', { busy: true, reason: 'bot_match' });
    console.log('[GameContext] Presence toggled: busy (bot_match)');

    setMatchmakingStatus('MATCHMAKING_OR_WAITING');
    s.emit('matchmaking:find_bot', { categoryId, difficulty });
  }, []);

  const cancelMatchmaking = useCallback(() => {
    const s = socketRef.current;
    if (!s?.connected) return;
    // Kembalikan presence ke normal saat cancel
    s.emit('toggle_presence', { busy: false });
    s.emit('matchmaking:cancel');
  }, []);

  const createInviteRoom = useCallback((categoryId: number) => {
    const s = socketRef.current;
    if (!s?.connected) return;
    setMatchmakingError(null);
    s.emit('matchmaking:invite_room', { categoryId });
  }, []);

  const joinByCode = useCallback((roomCode: string) => {
    const s = socketRef.current;
    if (!s?.connected) return;
    setMatchmakingError(null);
    s.emit('matchmaking:join_room', { roomCode });
  }, []);

  const resetMatchmaking = useCallback(() => {
    setMatchmakingStatus('IDLE');
    setMatchmakingError(null);
    setGameData(null);
    setOpponentInfo(null);
    setPrivateRoomCode(null);
    // Kembalikan presence ke normal
    socketRef.current?.emit('toggle_presence', { busy: false });
    // Tinggalkan room
    socketRef.current?.emit('leave_room');
    // Force purge on backend
    socketRef.current?.emit('game:purge');
  }, []);

  // ── Gameplay actions ───────────────────────────────────────────────────────

  const submitAnswer = useCallback((answer: number, questionIndex: number) => {
    socketRef.current?.emit('game:submit_answer', { answer, questionIndex });
  }, []);

  const finishGame = useCallback(() => {
    socketRef.current?.emit('game:finish');
    // Kembalikan presence ke normal setelah game selesai
    socketRef.current?.emit('toggle_presence', { busy: false });
  }, []);

  // ── Generic event helpers (untuk useGameEngine) ────────────────────────────

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  const value: GameContextValue = {
    isConnected,
    socket,
    matchmakingStatus,
    matchmakingError,
    gameData,
    opponentInfo,
    privateRoomCode,
    findRandomMatch,
    findBotMatch,
    cancelMatchmaking,
    createInviteRoom,
    joinByCode,
    resetMatchmaking,
    submitAnswer,
    finishGame,
    on,
    off,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a <GameProvider>');
  }
  return ctx;
}

/**
 * Ekspor destroySocket untuk dipakai saat logout.
 * Dengan ini, socket hanya diputus ketika user sengaja logout.
 */
export { destroySocket };
