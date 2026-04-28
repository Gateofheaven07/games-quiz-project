import { PrismaClient, GameMode, GameStatus, RoomStatus } from '@prisma/client';
import { GameEngine } from './game.engine';
/**
 * Tujuan File: game.service.ts (ORCHESTRATOR)
 * Berfungsi sebagai penghubung antara WebSocket, Database (Prisma), dan Game Engine.
 *
 * Kenapa dipisah?
 * Sesuai prinsip Clean Architecture, logic bisnis (Engine) tidak boleh tahu soal Database.
 * File ini yang bertugas mengambil data, memanggil engine, dan menyimpan hasilnya kembali.
 *
 * Alur Kerja:
 * 1. Di-trigger oleh WebSocket event handler.
 * 2. Ambil data dari Database (Prisma).
 * 3. Proses data dengan GameEngine.
 * 4. Simpan hasil ke Database.
 * 5. Kembalikan data ke pemanggil (WebSocket) untuk di-broadcast.
 */
// Singleton Prisma Client — satu instance untuk seluruh service
const prisma = new PrismaClient();
export class GameService {
    /**
     * Proses submit jawaban dari player.
     * @param payload Data jawaban yang dikirim dari client via WebSocket
     */
    static async processAnswer(payload) {
        const { userId, roomId, gameId, questionId, answer, timeSpentMs } = payload;
        // --- Validasi Input ---
        if (!userId)
            throw new Error('userId is required');
        if (!roomId)
            throw new Error('roomId is required');
        if (!gameId)
            throw new Error('gameId is required');
        if (!questionId)
            throw new Error('questionId is required');
        if (!answer)
            throw new Error('answer is required');
        // 1. Ambil data soal di dalam game ini dari DB
        const gameQuestion = await prisma.gameQuestion.findFirst({
            where: { gameId, questionId },
            include: { question: true },
        });
        if (!gameQuestion) {
            throw new Error('Question not found in this game');
        }
        // 2. Panggil Game Engine untuk cek kebenaran jawaban dan hitung skor
        const isCorrect = GameEngine.checkAnswer(gameQuestion.question.answer, answer);
        const scoreEarned = GameEngine.calculateScore(isCorrect, timeSpentMs);
        // 3. Update skor pemain di DB (hanya jika dapat skor)
        if (scoreEarned > 0) {
            // Cek dulu apakah RoomPlayer entry ada
            const roomPlayer = await prisma.roomPlayer.findUnique({
                where: { userId_roomId: { userId, roomId } },
            });
            if (!roomPlayer) {
                throw new Error(`Player ${userId} is not in room ${roomId}`);
            }
            await prisma.roomPlayer.update({
                where: { userId_roomId: { userId, roomId } },
                data: { score: { increment: scoreEarned } },
            });
        }
        return {
            isCorrect,
            scoreEarned,
            correctAnswer: gameQuestion.question.answer,
        };
    }
    /**
     * Mulai game baru di dalam room.
     * Akan membuat record Game dan mengambil soal-soal secara random.
     * @param roomId ID room yang akan di-start
     */
    static async startGame(roomId) {
        if (!roomId)
            throw new Error('roomId is required');
        // 1. Validasi Room — pastikan room ada dan statusnya WAITING
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { players: true },
        });
        if (!room)
            throw new Error(`Room ${roomId} not found`);
        if (room.status !== RoomStatus.WAITING) {
            throw new Error(`Room is already in status: ${room.status}`);
        }
        // 2. Ambil soal dari DB DULU sebelum mengubah status apapun
        //    Agar tidak ada state yang tidak konsisten jika soal tidak tersedia
        const questions = await prisma.question.findMany({ take: 5 });
        if (questions.length === 0) {
            throw new Error('No questions available in database');
        }
        // 3. Update status Room menjadi PLAYING
        await prisma.room.update({
            where: { id: roomId },
            data: { status: RoomStatus.PLAYING },
        });
        // 4. Buat record Game
        const game = await prisma.game.create({
            data: {
                roomId,
                mode: GameMode.QUIZ,
                status: GameStatus.STARTED,
                startedAt: new Date(),
            },
        });
        // 5. Hubungkan soal ke game (GameQuestion)
        await prisma.gameQuestion.createMany({
            data: questions.map((q, i) => ({
                gameId: game.id,
                questionId: q.id,
                order: i + 1,
            })),
        });
        return {
            gameId: game.id,
            message: 'Game started successfully',
            questionCount: questions.length,
        };
    }
    /**
     * Selesaikan game dan tentukan pemenang.
     * Simpan GameResult ke database untuk semua player.
     * @param gameId ID game yang selesai
     */
    static async finishGame(gameId) {
        if (!gameId)
            throw new Error('gameId is required');
        // 1. Ambil game beserta room dan players
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                room: {
                    include: { players: true },
                },
            },
        });
        if (!game)
            throw new Error(`Game ${gameId} not found`);
        // Idempotent — jika sudah selesai, langsung return
        if (game.status === GameStatus.FINISHED)
            return;
        // Pastikan room ada (defensive check)
        if (!game.room)
            throw new Error(`Room for game ${gameId} not found`);
        const players = game.room.players;
        // Jika tidak ada pemain, langsung finish game saja tanpa simpan result
        if (players.length === 0) {
            await prisma.game.update({
                where: { id: gameId },
                data: { status: GameStatus.FINISHED, endedAt: new Date() },
            });
            await prisma.room.update({
                where: { id: game.roomId },
                data: { status: RoomStatus.FINISHED },
            });
            return;
        }
        // 2. Tentukan pemenang menggunakan GameEngine
        const playerDataForEngine = players.map((p) => ({
            userId: p.userId,
            username: p.userId, // username bisa di-fetch terpisah jika perlu
            isReady: p.isReady,
            score: p.score,
        }));
        const winner = GameEngine.determineWinner(playerDataForEngine);
        // 3. Simpan GameResult untuk setiap pemain
        await prisma.gameResult.createMany({
            data: players.map((p) => ({
                userId: p.userId,
                gameId: game.id,
                score: p.score,
                isWinner: winner !== null && winner.userId === p.userId,
            })),
        });
        // 4. Update status Game menjadi FINISHED
        await prisma.game.update({
            where: { id: gameId },
            data: { status: GameStatus.FINISHED, endedAt: new Date() },
        });
        // 5. Update status Room menjadi FINISHED
        await prisma.room.update({
            where: { id: game.roomId },
            data: { status: RoomStatus.FINISHED },
        });
    }
}
//# sourceMappingURL=game.service.js.map