'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { AppSidebar, AppMobileNav } from '../../components/AppSidebar';
import { getSocket } from '../../lib/socketSingleton';

interface Notification {
  id: string;
  type: 'MESSAGE' | 'BATTLE_INVITE';
  status: 'READ' | 'UNREAD';
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatar: string | null;
  };
  message?: {
    id: string;
    content: string;
  };
  room?: {
    id: string;
    code: string;
    categoryId: number;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, getAuthClient, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) return;

    const fetchNotifications = async () => {
      try {
        const client = getAuthClient();
        const res = await client.get('/notifications');
        const notifs = res.data?.data?.notifications || [];
        setNotifications(notifs);

        const unreadIds = notifs.filter((n: Notification) => n.status === 'UNREAD').map((n: Notification) => n.id);
        if (unreadIds.length > 0) {
          await client.post('/notifications/read', { notificationIds: unreadIds });
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    const socket = getSocket(token);

    const handleNewMessage = (newNotif: Notification) => {
      setNotifications(prev => [newNotif, ...prev]);
    };

    const handleNewInvite = (newNotif: Notification) => {
      setNotifications(prev => [newNotif, ...prev]);
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('receive_invite', handleNewInvite);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('receive_invite', handleNewInvite);
    };
  }, [isAuthenticated, authLoading, token, getAuthClient]);

  const handleQuickReply = (receiverId: string, notificationId: string) => {
    const content = replyText[notificationId]?.trim();
    if (!content || !token) return;

    const socket = getSocket(token);
    socket.emit('chat:send', { receiverId, content });
    
    // Clear input
    setReplyText(prev => ({ ...prev, [notificationId]: '' }));
    
    // Optional: show a success toast here
  };

  const handleAcceptInvite = (roomCode: string) => {
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('matchmaking:join_room', { roomCode });
    // Assuming the server replies with matchmaking:game_ready, it will navigate natively 
    // or we can manually push to /game if needed, but normally socket handles it
    router.push('/game');
  };

  const handleDeclineInvite = (notificationId: string) => {
    // Optimistically remove from list
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e14]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#00d1ff]"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#dde3e7] selection:bg-cyan-500/30 relative overflow-hidden flex flex-col font-sans">
      {/* Background Decorations */}
      <div className="bg-orb bg-orb-blue top-[-10%] left-[-10%] opacity-40"></div>
      <div className="bg-orb bg-orb-purple bottom-[-10%] right-[-10%] opacity-30"></div>
      
      <AppMobileNav active="Notifikasi" />
      
      <div className="flex flex-1 w-full relative z-10">
        <AppSidebar active="Notifikasi" />
        
        <main className="flex-1 mt-16 lg:ml-72 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto pb-40 overflow-x-hidden">
          <header className="mb-12 relative">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 animate-glow-pulse">
                <span className="material-symbols-outlined text-white text-3xl">notifications_active</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent leading-none">
                  Pusat Notifikasi
                </h1>
                <p className="text-cyan-400/70 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] mt-1">
                  Pesan masuk & Undangan Pertempuran
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-6 relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] font-black animate-pulse">Mensinkronisasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="glass-card rounded-[2rem] p-16 text-center border-white/5 flex flex-col items-center justify-center group hover:border-cyan-500/20 transition-all duration-500 bg-gradient-to-b from-white/[0.04] to-transparent">
                <div className="w-24 h-24 rounded-full bg-slate-900/50 flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-6xl text-slate-700 group-hover:text-cyan-500/50 transition-colors duration-500">notifications_off</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Semua Beres!</h3>
                <p className="text-slate-500 font-medium tracking-wide max-w-xs mx-auto">
                  Belum ada notifikasi baru untuk Anda saat ini. Kami akan memberi tahu jika ada hal penting.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {notifications.map((notif, idx) => (
                  <div 
                    key={notif.id} 
                    className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                  >
                    {notif.status === 'UNREAD' && (
                      <div className="absolute top-0 right-0 w-2 h-2 m-5 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(0,209,255,0.8)] animate-pulse z-10"></div>
                    )}

                    <div className="flex gap-5 relative z-10">
                      {/* Avatar */}
                      <div className="shrink-0">
                        <div className="relative group/avatar">
                          {notif.sender.avatar ? (
                            <img src={notif.sender.avatar} alt={notif.sender.username} className="w-14 h-14 rounded-xl object-cover border border-white/10 group-hover/avatar:border-cyan-500/50 transition-colors" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-slate-300 font-black text-xl group-hover/avatar:border-cyan-500/50 transition-colors">
                              {notif.sender.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg bg-[#0b0e14] flex items-center justify-center border border-white/10 shadow-lg">
                            <span className={`material-symbols-outlined text-[16px] ${notif.type === 'BATTLE_INVITE' ? 'text-purple-400' : 'text-cyan-400'}`}>
                              {notif.type === 'BATTLE_INVITE' ? 'swords' : 'chat'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-white text-base tracking-tight">{notif.sender.username}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {notif.type === 'MESSAGE' && notif.message && (
                          <div className="space-y-4">
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 italic text-slate-300 text-sm">
                              "{notif.message.content}"
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyText[notif.id] || ''}
                                onChange={(e) => setReplyText({ ...replyText, [notif.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleQuickReply(notif.sender.id, notif.id);
                                }}
                                placeholder="Tulis balasan..."
                                className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 placeholder:text-slate-600 transition-all"
                              />
                              <button
                                onClick={() => handleQuickReply(notif.sender.id, notif.id)}
                                disabled={!replyText[notif.id]?.trim()}
                                className="w-11 h-11 bg-cyan-500 text-slate-900 rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                              >
                                <span className="material-symbols-outlined text-xl">send</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {notif.type === 'BATTLE_INVITE' && notif.room && (
                          <div className="space-y-4">
                            <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl p-4 border border-white/5">
                              <p className="text-slate-300 text-sm font-medium">
                                Mengirimkan tantangan duel! Siapkah Anda untuk bertempur?
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleAcceptInvite(notif.room!.code)}
                                className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-outlined text-lg">swords</span>
                                Terima Duel
                              </button>
                              <button
                                onClick={() => handleDeclineInvite(notif.id)}
                                className="flex-1 sm:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:text-white transition-all"
                              >
                                Abaikan
                              </button>
                              
                              <CountdownTimer createdAt={notif.createdAt} onExpire={() => handleDeclineInvite(notif.id)} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Simple Countdown Timer Component
function CountdownTimer({ createdAt, onExpire }: { createdAt: string, onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    const remaining = Math.max(0, 60 - elapsed);
    setTimeLeft(remaining);

    if (remaining === 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt, onExpire]);

  if (timeLeft === 0) return null;

  return (
    <div className="ml-auto flex items-center gap-1 text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-white/5">
      <span className="material-symbols-outlined text-[14px]">timer</span>
      <span className="text-xs font-bold font-mono">{timeLeft}s</span>
    </div>
  );
}
