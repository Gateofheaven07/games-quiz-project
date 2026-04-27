import { Socket } from 'socket.io';
export interface AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
}
export declare function setupSocketHandlers(io: any): void;
export default setupSocketHandlers;
//# sourceMappingURL=socketHandlers.d.ts.map