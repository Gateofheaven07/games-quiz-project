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
}
/** Add a player to the queue. Returns an opponent if found, otherwise null. */
export declare function enqueue(player: WaitingPlayer): WaitingPlayer | null;
/** Remove a player from any queue (e.g., on cancel or disconnect). */
export declare function remove(socketId: string): void;
/** Check if a socket is currently in queue. */
export declare function isWaiting(socketId: string): boolean;
/** Debug helper */
export declare function getQueueStats(): Record<number, number>;
//# sourceMappingURL=matchmakingQueue.d.ts.map