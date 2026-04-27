'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Trophy, ArrowLeft } from 'lucide-react';

export default function GameResultsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Game Over!</h1>
          <p className="text-slate-400 mb-8">Thanks for playing QuizBattle. Your score has been recorded.</p>

          <div className="space-y-4">
            <Link href="/dashboard" className="block">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3">
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/profile" className="block">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 py-3">
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
