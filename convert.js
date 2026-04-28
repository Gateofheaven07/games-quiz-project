const fs = require('fs');

function htmlToJsx(html) {
  // Simple regex-based HTML to JSX conversion
  let jsx = html
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
    .replace(/<img([^>]+)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<img${p1}/>`; // Close img tags
    })
    .replace(/<input([^>]+)>/g, (match, p1) => {
      if (p1.endsWith('/')) return match;
      return `<input${p1}/>`; // Close input tags
    })
    .replace(/style="([^"]+)"/g, (match, styles) => {
      // Very basic style string to object converter
      const styleObj = styles.split(';').filter(s => s.trim()).map(s => {
        const [key, value] = s.split(':');
        if (!key || !value) return '';
        const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
        return `"${camelKey}": "${value.trim().replace(/'/g, "\\'")}"`;
      }).filter(s => s).join(', ');
      return `style={{${styleObj}}}`;
    });
    
  return jsx;
}

function processLeaderboard() {
  const html = fs.readFileSync('leaderboard.html', 'utf8');
  
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return;
  
  let bodyContent = htmlToJsx(bodyMatch[1]);
  
  const component = `'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { leaderboardApi } from '../../lib/api';

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('allTime');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const response = await leaderboardApi.getGlobal(50, 0, timeframe);
        setLeaderboard(response.data.data.leaderboard);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [isAuthenticated, timeframe]);

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="font-body-md text-on-background min-h-screen flex flex-col bg-[#0e1417]" style={{backgroundImage: "radial-gradient(circle at 20% 30%, rgba(0, 209, 255, 0.05) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(207, 92, 255, 0.05) 0%, transparent 40%)"}}>
      ${bodyContent}
    </div>
  );
}
`;
  
  fs.writeFileSync('apps/web/app/leaderboard/page.tsx', component);
  console.log('Leaderboard written');
}

function processProfile() {
  const html = fs.readFileSync('profile.html', 'utf8');
  
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return;
  
  let bodyContent = htmlToJsx(bodyMatch[1]);
  
  const component = `'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { leaderboardApi, quizApi } from '../../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, getAuthClient } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const client = getAuthClient();
        const rankResponse = await leaderboardApi.getUserRank(user.id);
        const rank = rankResponse.data.data.rank;
        const historyResponse = await quizApi.getHistory(client, 10, 0);
        const data = historyResponse.data.data;
        setStats({
          gamesPlayed: data.total,
          totalScore: data.results.reduce((sum, r) => sum + r.score, 0),
          averageScore: data.results.length > 0 ? data.results.reduce((sum, r) => sum + r.score, 0) / data.results.length : 0,
          perfectGames: data.results.filter(r => r.correctAnswers === r.totalQuestions).length,
          rank,
        });
        setHistory(data.results);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [isAuthenticated, user, getAuthClient]);

  if (authLoading || !isAuthenticated || !user) return null;

  return (
    <div className="font-body-md text-on-background selection:bg-primary-container selection:text-on-primary-container bg-[#0b0e14] text-[#dde3e7] min-h-screen">
      ${bodyContent}
    </div>
  );
}
`;
  
  fs.writeFileSync('apps/web/app/profile/page.tsx', component);
  console.log('Profile written');
}

processLeaderboard();
processProfile();
