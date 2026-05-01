'use client';

import { useCallback } from 'react';
import { useGame } from '../context/GameContext';

/**
 * useGameInit
 * 
 * Hook khusus untuk menjamin pembersihan state (Purge) sebelum memulai
 * sesi permainan baru. Mencegah bug "GameOver" prematur yang disebabkan
 * oleh residu state dari sesi sebelumnya.
 */
export function useGameInit() {
  const { resetMatchmaking, findRandomMatch, findBotMatch, socket } = useGame();

  const initializeNewSession = useCallback(() => {
    console.log('[useGameInit] Purging previous game session...');
    
    // 1. Reset client-side context state
    resetMatchmaking();

    // 2. Extra safety: Ensure socket is connected
    if (socket && !socket.connected) {
      socket.connect();
    }
  }, [resetMatchmaking, socket]);

  const startQuickMatch = useCallback((categoryId: number) => {
    initializeNewSession();
    findRandomMatch(categoryId);
  }, [initializeNewSession, findRandomMatch]);

  const startPracticeMatch = useCallback((categoryId: number, difficulty: any) => {
    initializeNewSession();
    findBotMatch(categoryId, difficulty);
  }, [initializeNewSession, findBotMatch]);

  return {
    startQuickMatch,
    startPracticeMatch,
    purgeSession: initializeNewSession
  };
}
