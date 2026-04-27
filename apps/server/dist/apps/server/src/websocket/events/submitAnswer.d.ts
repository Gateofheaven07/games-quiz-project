import { AuthenticatedSocket } from '../../lib/socketHandlers';
/**
 * Event: game:submit_answer
 *
 * Kenapa dipisah?
 * Sesuai prinsip Clean Architecture, file event ini hanya bertugas menerima
 * request dari Socket.IO dan meresponsnya, tanpa ada logic bisnis di sini.
 */
export declare function submitAnswerHandler(socket: AuthenticatedSocket, io: any, data: any): Promise<void>;
//# sourceMappingURL=submitAnswer.d.ts.map