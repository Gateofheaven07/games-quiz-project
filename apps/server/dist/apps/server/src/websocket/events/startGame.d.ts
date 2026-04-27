import { AuthenticatedSocket } from '../../lib/socketHandlers';
/**
 * Event: game:start
 *
 * Kenapa dipisah?
 * Memisahkan tanggung jawab menerima request socket dengan logic pembuatan state game.
 */
export declare function startGameHandler(socket: AuthenticatedSocket, io: any, data: any): Promise<void>;
//# sourceMappingURL=startGame.d.ts.map