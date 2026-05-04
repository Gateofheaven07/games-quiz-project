/**
 * matchmakingQueue.ts
 *
 * Manages the in-memory queue for random matchmaking.
 * Structure:  Map<categoryId, WaitingPlayer[]>
 *
 * Flow:
 *  1. Player emits `matchmaking:find`  → enqueue()
 *  2. If another player is already waiting in the same category → dequeue() both and return pair
 *  3. If no one waiting → player sits in queue; emitted `matchmaking:searching`
 *  4. Player can cancel via `matchmaking:cancel` → remove()
 */

export interface WaitingPlayer {
  userId: string;
  socketId: string;
  username: string;
  categoryId: number;
  enqueuedAt: number;
  language: string;
}

// categoryId:language → queue of waiting players
const queue = new Map<string, WaitingPlayer[]>();

/** Add a player to the queue. Returns an opponent if found, otherwise null. */
export function enqueue(player: WaitingPlayer): WaitingPlayer | null {
  const key = `${player.categoryId}:${player.language}`;

  if (!queue.has(key)) {
    queue.set(key, []);
  }

  const waiting = queue.get(key)!;

  // Guard: don't let the same socket join twice
  const alreadyIn = waiting.findIndex((p) => p.socketId === player.socketId);
  if (alreadyIn !== -1) {
    waiting.splice(alreadyIn, 1);
  }

  if (waiting.length > 0) {
    // Match found — pop the first waiter
    const opponent = waiting.shift()!;
    return opponent;
  }

  // No match — push this player into queue
  waiting.push(player);
  return null;
}

/** Remove a player from any queue (e.g., on cancel or disconnect). */
export function remove(socketId: string): void {
  for (const [, players] of queue) {
    const idx = players.findIndex((p) => p.socketId === socketId);
    if (idx !== -1) {
      players.splice(idx, 1);
      return;
    }
  }
}

/** Check if a socket is currently in queue. */
export function isWaiting(socketId: string): boolean {
  for (const [, players] of queue) {
    if (players.some((p) => p.socketId === socketId)) return true;
  }
  return false;
}

/** Debug helper */
export function getQueueStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const [key, players] of queue) {
    stats[key] = players.length;
  }
  return stats;
}
