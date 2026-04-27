'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export interface GameRoom {
  id: string;
  player1: string;
  player2?: string;
  status: 'waiting' | 'active' | 'finished';
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: string;
}

export const useSocket = () => {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Connect to socket server
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    socket.on('room:joined', (data) => {
      console.log('[Socket] Joined room:', data);
      setGameRoom(data);
    });

    socket.on('room:ready', (data) => {
      console.log('[Socket] Room ready:', data);
      setGameRoom((prev) => (prev ? { ...prev, status: 'active' } : null));
    });

    socket.on('game:question', (data) => {
      console.log('[Socket] Question received:', data);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.index);
      setTotalQuestions(data.total);
    });

    socket.on('game:finished', (data) => {
      console.log('[Socket] Game finished:', data);
      setGameRoom((prev) => (prev ? { ...prev, status: 'finished' } : null));
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const createRoom = useCallback((difficulty: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('user:create_room', { difficulty });
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('user:join_room', { roomId });
  }, []);

  const submitAnswer = useCallback((answer: number, questionIndex: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:submit_answer', { answer, questionIndex });
  }, []);

  const nextQuestion = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:next_question');
  }, []);

  const finishGame = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:finish');
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, handler);
  }, []);

  return {
    isConnected,
    gameRoom,
    currentQuestion,
    questionIndex,
    totalQuestions,
    createRoom,
    joinRoom,
    submitAnswer,
    nextQuestion,
    finishGame,
    on,
    off,
  };
};
