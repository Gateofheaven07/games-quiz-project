import { PrismaClient, GameStatus, RoomStatus } from '@prisma/client';
import { GameEngine } from './game.engine';
const prisma = new PrismaClient();
/**
 * Tujuan File: game.service.ts (ORCHESTRATOR)
 * Berfungsi sebagai penghubung (middleman) antara WebSocket, Database (Prisma), dan Game Engine.
 *
 * Kenapa dipisah?
 * Sesuai prinsip Clean Architecture, logic bisnis (Engine) tidak boleh tahu soal Database.
 * File ini yang bertugas mengambil data, memanggil engine, dan menyimpan hasilnya kembali.
 *
 * Alur Kerja:
 * 1. Di-trigger oleh WebSocket event.
 * 2. Ambil data dari Database (Prisma).
 * 3. Proses data dengan GameEngine.
 * 4. Simpan hasil ke Database.
 * 5. Kembalikan data ke pemanggil (WebSocket) untuk di-broadcast.
 */
export class GameService {
    /**
     * Proses submit jawaban dari player.
     * @param payload Data jawaban dari client
     */
    static async processAnswer(payload) {
        const { userId, roomId, gameId, questionId, answer, timeSpentMs } = payload;
        // 1. Ambil data soal dan game dari DB
        const gameQuestion = await prisma.gameQuestion.findFirst({
            where: { gameId, questionId },
            include: { question: true }
        });
        if (!gameQuestion)
            throw new Error('Question not found in this game');
        // 2. Panggil Game Engine untuk memproses jawaban
        const isCorrect = GameEngine.checkAnswer(gameQuestion.question.answer, answer);
        const scoreEarned = GameEngine.calculateScore(isCorrect, timeSpentMs);
        // 3. Update skor pemain di DB (jika benar)
        if (scoreEarned > 0) {
            await prisma.roomPlayer.update({
                where: {
                    userId_roomId: {
                        userId,
                        roomId
                    }
                },
                data: {
                    score: {
                        increment: scoreEarned
                    }
                }
            });
        }
        return {
            isCorrect,
            scoreEarned,
            correctAnswer: gameQuestion.question.answer
        };
    }
    /**
     * Mulai game baru di dalam room
     */
    static async startGame(roomId) {
        // Validasi Room
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { players: true }
        });
        if (!room)
            throw new Error('Room not found');
        if (room.status !== RoomStatus.WAITING)
            throw new Error('Room is already playing');
        // Update Room status
        await prisma.room.update({
            where: { id: roomId },
            data: { status: RoomStatus.PLAYING }
        });
        // Buat Game Record
        const game = await prisma.game.create({
            data: {
                roomId,
                mode: 'QUIZ',
                status: GameStatus.STARTED,
                startedAt: new Date()
            }
        });
        // Generate Soal (Contoh: ambil 5 soal random)
        const questions = await prisma.question.findMany({ take: 5 });
        for (let i = 0; i < questions.length; i++) {
            await prisma.gameQuestion.create({
                data: {
                    gameId: game.id,
                    questionId: questions[i].id,
                    order: i + 1
                }
            });
        }
        return {
            gameId: game.id,
            message: 'Game started successfully',
            questionCount: questions.length
        };
    }
}
//# sourceMappingURL=game.service.js.map