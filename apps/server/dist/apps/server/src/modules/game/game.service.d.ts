import { AnswerPayload, AnswerResult, StartGameResult } from './game.types';
export declare class GameService {
    /**
     * Proses submit jawaban dari player.
     * @param payload Data jawaban yang dikirim dari client via WebSocket
     */
    static processAnswer(payload: AnswerPayload): Promise<AnswerResult>;
    /**
     * Mulai game baru di dalam room.
     * Akan membuat record Game dan mengambil soal-soal secara random.
     * @param roomId ID room yang akan di-start
     */
    static startGame(roomId: string, categoryId?: number): Promise<StartGameResult>;
    /**
     * Selesaikan game dan tentukan pemenang.
     * Simpan GameResult ke database untuk semua player.
     * @param gameId ID game yang selesai
     */
    static finishGame(gameId: string): Promise<void>;
}
//# sourceMappingURL=game.service.d.ts.map