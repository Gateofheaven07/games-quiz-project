import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from './useSocket';

interface UseGameEngineProps {
  userId?: string;
  gameRoom: any; // GameRoom type
  submitAnswer: (answer: number, questionIndex: number) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  totalDuration?: number;
}

export function useGameEngine({
  userId,
  gameRoom,
  submitAnswer,
  on,
  off,
  totalDuration = 30,
}: UseGameEngineProps) {
  const router = useRouter();

  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<'idle' | 'selected' | 'benar' | 'salah'>('idle');
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  const totalRounds = gameRoom?.questions?.length || 10;
  const round = Math.min(currentQ + 1, totalRounds);
  const currentQuestion = gameRoom?.questions?.[currentQ];

  // Socket event listeners
  useEffect(() => {
    const handleAnswerResult = (data: any) => {
      if (data.isCorrect) {
        setAnswerState('benar');
        setPlayerScore((prev) => prev + data.scoreEarned);
      } else {
        setAnswerState('salah');
      }

      // Auto transition to next question after 1.5s
      setTimeout(() => {
        setCurrentQ((q) => Math.min(q + 1, totalRounds - 1));
        setSelectedAnswer(null);
        setAnswerState('idle');
      }, 1500);
    };

    const handlePlayerAnswered = (data: any) => {
      if (data.userId !== userId) {
        setOpponentScore((prev) => prev + data.scoreEarned);
      }
    };

    const handleGameFinished = (data: any) => {
      setGameEnded(true);

      let message = 'Pertandingan Selesai!';
      if (data.isDraw) {
        message = 'Hasil Seri Murni!';
      } else if (data.winnerId === userId) {
        message = 'Kamu Menang!';
        const p1 = data.results?.p1;
        const p2 = data.results?.p2;
        if (p1 && p2 && p1.score === p2.score && p1.score > 0) {
          message += '\n(Menang karena lebih cepat!)';
        }
      } else if (data.winnerId) {
        message = 'Kamu Kalah!';
        const p1 = data.results?.p1;
        const p2 = data.results?.p2;
        if (p1 && p2 && p1.score === p2.score && p1.score > 0) {
          message += '\n(Kalah karena lebih lambat!)';
        }
      }

      setTimeout(() => {
        alert(`${message}\n\nSkor Anda: ${playerScore}`);
        router.push('/dashboard');
      }, 2000);
    };

    on('game:answer_result', handleAnswerResult);
    on('game:player_answered', handlePlayerAnswered);
    on('game:finished', handleGameFinished);

    return () => {
      off('game:answer_result', handleAnswerResult);
      off('game:player_answered', handlePlayerAnswered);
      off('game:finished', handleGameFinished);
    };
  }, [on, off, totalRounds, userId, playerScore, router]);

  const handleAnswer = useCallback(
    (idx: number) => {
      if (answerState !== 'idle' || !gameRoom) return;
      setSelectedAnswer(idx);
      setAnswerState('selected');
      submitAnswer(idx, currentQ);
    },
    [answerState, gameRoom, submitAnswer, currentQ]
  );

  // Global Timer logic
  useEffect(() => {
    if (gameRoom?.status !== 'active' || gameEnded) return;

    if (timeLeft <= 0) {
      setGameEnded(true);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, gameRoom?.status, gameEnded]);

  return {
    currentQ,
    round,
    totalRounds,
    currentQuestion,
    timeLeft,
    selectedAnswer,
    answerState,
    playerScore,
    opponentScore,
    gameEnded,
    handleAnswer,
  };
}
