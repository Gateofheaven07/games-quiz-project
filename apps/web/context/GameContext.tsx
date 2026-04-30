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
  | 'idle'
  | 'connecting'
  | 'searching'
  | 'opponent_found'
  | 'preparing'
  | 'ready'
  | 'error';

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

  const [isConnected,       setIsConnected]       = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<MatchmakingStatus>('idle');
  const [matchmakingError,  setMatchmakingError]  = useState<string | null>(null);
  const [gameData,          setGameData]           = useState<GameReadyPayload | null>(null);
  const [opponentInfo,      setOpponentInfo]       = useState<PlayerInfo | null>(null);
  const [privateRoomCode,   setPrivateRoomCode]    = useState<string | null>(null);

  // ── Setup socket listeners (idempotent) ────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Gunakan singleton — tidak membuat koneksi baru jika sudah ada
    const socket = getSocket(token);
    socketRef.current = socket;

    // Sync state dengan kondisi socket saat ini
    setIsConnected(socket.connected);
    if (socket.connected) {
      setMatchmakingStatus('idle');
    } else {
      setMatchmakingStatus('connecting');
    }

    // ── Core events ─────────────────────────────────────────────────────────
    const onConnect = () => {
      console.log('[GameContext] Socket connected:', socket.id);
      setIsConnected(true);
      setMatchmakingStatus('idle');
    };

    const onConnectionSuccess = (data: any) => {
      console.log('[GameContext] Handshake confirmed:', data);
      setMatchmakingStatus('idle');
    };

    const onDisconnect = (reason: string) => {
      // console.trace dipasang di socketSingleton — tidak perlu duplikasi di sini
      console.warn('[GameContext] Socket disconnected. Reason:', reason);
      setIsConnected(false);
      // Jangan reset matchmaking status di sini — bisa jadi reconnect otomatis
    };

    const onConnectError = (err: Error) => {
      console.error('[GameContext] Connection error:', err.message);
      setMatchmakingStatus('error');
      setMatchmakingError(`Tidak dapat terhubung ke server: ${err.message}`);
    };

    // ── Matchmaking events ───────────────────────────────────────────────────
    const onSearching = () => {
      console.log('[GameContext] Matchmaking: searching…');
      setMatchmakingStatus('searching');
    };

    const onOpponentFound = (data: { opponentId: string; opponentUsername: string; isBot?: boolean }) => {
      console.log('[GameContext] Opponent found:', data);
      setOpponentInfo({ userId: data.opponentId, username: data.opponentUsername, isBot: data.isBot });
      setMatchmakingStatus('opponent_found');
    };

    const onPreparing = (data: { roomId: string; message: string }) => {
      console.log('[GameContext] Preparing:', data.message);
      setMatchmakingStatus('preparing');
    };

    const onGameReady = (data: GameReadyPayload) => {
      console.log('[GameContext] Game ready:', data.roomId, '| isVsBot:', data.isVsBot);
      setGameData(data);
      setMatchmakingStatus('ready');
    };

    const onRoomCreated = (data: { roomId: string; roomCode: string }) => {
      console.log('[GameContext] Private room created:', data.roomCode);
      setPrivateRoomCode(data.roomCode);
      setMatchmakingStatus('searching');
    };

    const onCancelled = () => setMatchmakingStatus('idle');

    const onMatchmakingError = (data: { message: string }) => {
      console.error('[GameContext] Matchmaking error:', data.message);
      setMatchmakingStatus('error');
      setMatchmakingError(data.message);
    };

    const onRoomNotFound = (data: { roomCode: string }) => {
      setMatchmakingStatus('error');
      setMatchmakingError(`Room dengan kode "${data.roomCode}" tidak ditemukan.`);
    };

    // Daftarkan semua listener
    socket.on('connect',                    onConnect);
    socket.on('connection_success',         onConnectionSuccess);
    socket.on('disconnect',                 onDisconnect);
    socket.on('connect_error',              onConnectError);
    socket.on('matchmaking:searching',      onSearching);
    socket.on('matchmaking:opponent_found', onOpponentFound);
    socket.on('matchmaking:preparing',      onPreparing);
    socket.on('matchmaking:game_ready',     onGameReady);
    socket.on('matchmaking:room_created',   onRoomCreated);
    socket.on('matchmaking:cancelled',      onCancelled);
    socket.on('matchmaking:error',          onMatchmakingError);
    socket.on('matchmaking:room_not_found', onRoomNotFound);

    // Cleanup: HANYA lepas listener — JANGAN disconnect socket!
    // Socket singleton hanya diputus saat logout.
    return () => {
      socket.off('connect',                    onConnect);
      socket.off('connection_success',         onConnectionSuccess);
      socket.off('disconnect',                 onDisconnect);
      socket.off('connect_error',              onConnectError);
      socket.off('matchmaking:searching',      onSearching);
      socket.off('matchmaking:opponent_found', onOpponentFound);
      socket.off('matchmaking:preparing',      onPreparing);
      socket.off('matchmaking:game_ready',     onGameReady);
      socket.off('matchmaking:room_created',   onRoomCreated);
      socket.off('matchmaking:cancelled',      onCancelled);
      socket.off('matchmaking:error',          onMatchmakingError);
      socket.off('matchmaking:room_not_found', onRoomNotFound);
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

    setMatchmakingStatus('searching');
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
    setMatchmakingStatus('idle');
    setMatchmakingError(null);
    setGameData(null);
    setOpponentInfo(null);
    setPrivateRoomCode(null);
    // Kembalikan presence ke normal
    socketRef.current?.emit('toggle_presence', { busy: false });
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
    socket: socketRef.current,
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
