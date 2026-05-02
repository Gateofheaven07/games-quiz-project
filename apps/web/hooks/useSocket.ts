'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getSocket, destroySocket, SOCKET_URL } from '../lib/socketSingleton';

// SOCKET_URL imported from lib/socketSingleton

// ── Types ────────────────────────────────────────────────────────────────────

export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface BotDifficultyInfo {
  label:       string;
  emoji:       string;
  description: string;
}

export const BOT_DIFFICULTY_INFO: Record<BotDifficulty, BotDifficultyInfo> = {
  EASY:   { label: 'Mudah',  emoji: '🟢', description: 'Akurasi 40%, respons 5–8 detik' },
  MEDIUM: { label: 'Sedang', emoji: '🟡', description: 'Akurasi 65%, respons 3–5 detik' },
  HARD:   { label: 'Sulit',  emoji: '🔴', description: 'Akurasi 90%, respons 1–3 detik' },
};

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // -1 on client (hidden)
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

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useSocket = () => {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [isConnected,       setIsConnected]       = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<MatchmakingStatus>('idle');
  const [matchmakingError,  setMatchmakingError]  = useState<string | null>(null);
  const [gameData,          setGameData]           = useState<GameReadyPayload | null>(null);
  const [opponentInfo,      setOpponentInfo]       = useState<PlayerInfo | null>(null);
  const [privateRoomCode,   setPrivateRoomCode]    = useState<string | null>(null);

  // ── Sync with singleton ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket(token);
    socketRef.current = socket;
    setSocket(socket);
    setIsConnected(socket.connected);
    setMatchmakingStatus('connecting');

    // ── Core connection events ─────────────────────────────────────────────
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('connection_success', (data) => {
      console.log('[Socket] Handshake confirmed:', data);
      setMatchmakingStatus('idle');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected. Reason:', reason);
      setIsConnected(false);
      setMatchmakingStatus('idle');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setMatchmakingStatus('error');
      setMatchmakingError(`Tidak dapat terhubung ke server: ${err.message}`);
    });

    // ── Matchmaking events ─────────────────────────────────────────────────
    socket.on('matchmaking:searching', () => {
      console.log('[Matchmaking] Searching for opponent…');
      setMatchmakingStatus('searching');
    });

    socket.on('matchmaking:opponent_found', (data: { opponentId: string; opponentUsername: string }) => {
      console.log('[Matchmaking] Opponent found:', data);
      setOpponentInfo({ userId: data.opponentId, username: data.opponentUsername });
      setMatchmakingStatus('opponent_found');
    });

    socket.on('matchmaking:preparing', (data: { roomId: string; message: string }) => {
      console.log('[Matchmaking] Preparing:', data.message);
      setMatchmakingStatus('preparing');
    });

    socket.on('matchmaking:game_ready', (data: GameReadyPayload) => {
      console.log('[Matchmaking] Game ready:', data.roomId);
      setGameData(data);
      setMatchmakingStatus('ready');
    });

    socket.on('matchmaking:room_created', (data: { roomId: string; roomCode: string }) => {
      console.log('[Matchmaking] Private room created:', data.roomCode);
      setPrivateRoomCode(data.roomCode);
      setMatchmakingStatus('searching'); // waiting for guest
    });

    socket.on('matchmaking:cancelled', () => {
      setMatchmakingStatus('idle');
    });

    socket.on('matchmaking:error', (data: { message: string }) => {
      console.error('[Matchmaking] Error:', data.message);
      setMatchmakingStatus('error');
      setMatchmakingError(data.message);
    });

    socket.on('matchmaking:room_not_found', (data: { roomCode: string }) => {
      setMatchmakingStatus('error');
      setMatchmakingError(`Room dengan kode "${data.roomCode}" tidak ditemukan.`);
    });

    return () => {
      // Cleanup: HANYA lepas listener — JANGAN disconnect socket!
      // Instance singleton hanya diputus saat logout.
      socket.off('connect');
      socket.off('connection_success');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('matchmaking:searching');
      socket.off('matchmaking:opponent_found');
      socket.off('matchmaking:preparing');
      socket.off('matchmaking:game_ready');
      socket.off('matchmaking:room_created');
      socket.off('matchmaking:cancelled');
      socket.off('matchmaking:error');
      socket.off('matchmaking:room_not_found');
      
      socketRef.current = null;
      setSocket(null);
    };
  }, [isAuthenticated, token]);

  // ── Matchmaking actions ────────────────────────────────────────────────────

  const findRandomMatch = useCallback((categoryId: number) => {
    if (!socketRef.current?.connected) return;
    setMatchmakingError(null);
    socketRef.current.emit('matchmaking:find', { categoryId });
  }, []);

  /** Mulai mode Latihan vs Bot */
  const findBotMatch = useCallback((categoryId: number, difficulty: BotDifficulty) => {
    if (!socketRef.current?.connected) return;
    setMatchmakingError(null);
    setMatchmakingStatus('searching');
    socketRef.current.emit('matchmaking:find_bot', { categoryId, difficulty });
  }, []);

  const cancelMatchmaking = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('matchmaking:cancel');
  }, []);

  const createInviteRoom = useCallback((categoryId: number) => {
    if (!socketRef.current?.connected) return;
    setMatchmakingError(null);
    socketRef.current.emit('matchmaking:invite_room', { categoryId });
  }, []);

  const joinByCode = useCallback((roomCode: string) => {
    if (!socketRef.current?.connected) return;
    setMatchmakingError(null);
    socketRef.current.emit('matchmaking:join_room', { roomCode });
  }, []);

  // ── Gameplay actions ───────────────────────────────────────────────────────

  const submitAnswer = useCallback((answer: number, questionIndex: number) => {
    socketRef.current?.emit('game:submit_answer', { answer, questionIndex });
  }, []);

  const finishGame = useCallback(() => {
    socketRef.current?.emit('game:finish');
  }, []);

  // ── Generic event helpers (for useGameEngine) ──────────────────────────────

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  /** Reset matchmaking state so user can try again */
  const resetMatchmaking = useCallback(() => {
    setMatchmakingStatus('idle');
    setMatchmakingError(null);
    setGameData(null);
    setOpponentInfo(null);
    setPrivateRoomCode(null);
  }, []);

  return {
    // Connection
    socket,
    isConnected,
    socketRef,
    // Matchmaking
    matchmakingStatus,
    matchmakingError,
    gameData,
    opponentInfo,
    privateRoomCode,
    // Actions
    findRandomMatch,
    findBotMatch,
    cancelMatchmaking,
    createInviteRoom,
    joinByCode,
    resetMatchmaking,
    // Gameplay
    submitAnswer,
    finishGame,
    on,
    off,
  };
};
