'use client';

/**
 * socketSingleton.ts
 *
 * Singleton global untuk Socket.io. Hanya satu koneksi yang dibuat selama
 * sesi browser — tidak putus saat router.push() berpindah halaman.
 *
 * Cara kerja:
 *  - io() dipanggil SEKALI dan hasilnya disimpan di module-level variable.
 *  - Semua consumer (LobbyPage, GamePage, dll) berbagi instance yang sama.
 *  - Koneksi hanya ditutup jika user logout (panggil destroySocket()).
 */

import { io, Socket } from 'socket.io-client';

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Module-level singleton — persists across React re-renders & route changes
let _socket: Socket | null = null;
let _currentToken: string | null = null;

/**
 * Mengembalikan socket yang sudah ada, atau membuat satu yang baru.
 * Jika token berubah (re-login), koneksi lama diputus dan yang baru dibuat.
 */
export function getSocket(token: string): Socket {
  // Jika token berubah (misalnya logout → login ulang), reset socket
  if (_socket && _currentToken !== token) {
    console.log('[SocketSingleton] Token changed — resetting socket');
    _socket.disconnect();
    _socket = null;
  }

  if (!_socket) {
    console.log('[SocketSingleton] Creating new socket connection');
    _socket = io(SOCKET_URL, {
      auth:                 { token },
      transports:           ['websocket'], // Dipaksa ke websocket untuk menghindari masalah proxy/tunnel
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Terus mencoba reconnect
      timeout:              20000,    // Waktu tunggu koneksi sebelum error
    });

    _currentToken = token;

    // ── Diagnostic: trace every disconnect to find the caller ──────────────
    _socket.on('disconnect', (reason) => {
      console.warn('[SocketSingleton] Disconnected. Reason:', reason);
      // Stack trace untuk menemukan sumber pemanggil disconnect
      console.trace('[SocketSingleton] disconnect stack trace ↑');
    });

    _socket.on('connect', () => {
      console.log('[SocketSingleton] Connected:', _socket?.id);
    });

    _socket.on('connect_error', (err) => {
      console.error('[SocketSingleton] Connection error:', err.message);
    });
  }

  return _socket;
}

/**
 * Panggil ini HANYA saat user logout. Jangan panggil di komponen biasa.
 */
export function destroySocket(): void {
  if (_socket) {
    console.log('[SocketSingleton] Destroying socket (logout)');
    _socket.disconnect();
    _socket = null;
    _currentToken = null;
  }
}

/**
 * Cek apakah socket sedang terhubung (aman dipanggil kapan saja).
 */
export function isSocketConnected(): boolean {
  return _socket?.connected ?? false;
}
