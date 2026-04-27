'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = searchParams.get('difficulty') || 'medium';
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    isConnected,
    currentQuestion,
    questionIndex,
    totalQuestions,
    createRoom,
    submitAnswer,
  } = useSocket();

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isConnected && !gameStarted) {
      createRoom(difficulty);
      setGameStarted(true);
    }
  }, [isConnected, gameStarted, difficulty, createRoom]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || !currentQuestion || showResult) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, currentQuestion, showResult]);

  const handleTimeUp = () => {
    if (currentQuestion && selectedAnswer === null) {
      handleAnswerSubmit(-1); // Submit -1 for timeout
    }
  };

  const handleAnswerSubmit = (answer: number) => {
    if (!currentQuestion) return;

    setShowResult(true);
    const correct = answer === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    submitAnswer(answer, questionIndex);

    // Move to next question after delay
    setTimeout(() => {
      if (questionIndex + 1 < totalQuestions) {
        setSelectedAnswer(null);
        setShowResult(false);
        setTimer(30);
      } else {
        handleGameEnd();
      }
    }, 2000);
  };

  const handleGameEnd = () => {
    router.push('/game-results');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading question...</p>
        </div>
      </div>
    );
  }

  const timerColor = timer <= 10 ? 'text-red-400' : 'text-cyan-400';
  const progressPercent = ((questionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
            <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${timerColor}`}>
            <Clock className="w-6 h-6" />
            {timer}s
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          {/* Question */}
          <div className="mb-8">
            <p className="text-slate-400 text-sm mb-4">Difficulty: <span className="text-cyan-400 font-semibold capitalize">{difficulty}</span></p>
            <h2 className="text-2xl font-bold text-white mb-2">{currentQuestion.text}</h2>
            <p className="text-slate-400 text-sm">Category: {currentQuestion.category}</p>
          </div>

          {/* Answer Options */}
          {!showResult ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedAnswer(index);
                    handleAnswerSubmit(index);
                  }}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedAnswer === index
                      ? 'bg-cyan-600/30 border-cyan-400'
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  } ${selectedAnswer !== null && 'opacity-50 cursor-not-allowed'}`}
                >
                  <span className="text-white font-medium">{option}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isCorrectAnswer = index === currentQuestion.correctAnswer;
                const isSelected = selectedAnswer === index;
                
                return (
                  <div
                    key={index}
                    className={`w-full p-4 rounded-lg border flex items-center gap-3 ${
                      isCorrectAnswer
                        ? 'bg-green-600/30 border-green-400'
                        : isSelected && !isCorrect
                        ? 'bg-red-600/30 border-red-400'
                        : 'bg-slate-700/50 border-slate-600'
                    }`}
                  >
                    {isCorrectAnswer && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                    {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                    <span className="text-white font-medium">{option}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Result Message */}
          {showResult && (
            <div className={`mt-6 p-4 rounded-lg border ${
              isCorrect
                ? 'bg-green-600/20 border-green-400'
                : 'bg-red-600/20 border-red-400'
            }`}>
              <p className={`font-semibold ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect!'}
              </p>
              <p className="text-sm text-slate-300 mt-1">
                Moving to next question...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
