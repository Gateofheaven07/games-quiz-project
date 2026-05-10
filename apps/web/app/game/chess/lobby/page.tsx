'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../hooks/useAuth'
import { useToast } from '../../../../hooks/use-toast'
import { getSocket } from '../../../../lib/socketSingleton'
import axios from 'axios'

const DURATIONS = [
  { value: 5,  label: '5 Menit',  icon: '⚡', desc: 'Blitz cepat' },
  { value: 10, label: '10 Menit', icon: '🎯', desc: 'Rapid standar' },
  { value: 20, label: '20 Menit', icon: '♟️', desc: 'Klasik menengah' },
  { value: 30, label: '30 Menit', icon: '👑', desc: 'Turnamen penuh' },
]

const BOT_LEVELS = [
  { id: 'easy',   label: 'Mudah',  emoji: '😊', color: '#4aff91', desc: 'Cocok untuk pemula' },
  { id: 'normal', label: 'Normal', emoji: '🎯', color: '#feb127', desc: 'Tantangan seimbang' },
  { id: 'hard',   label: 'Sulit',  emoji: '💀', color: '#ff4545', desc: 'Grandmaster AI' },
]

export default function ChessLobbyPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, token } = useAuth()
  const { toast } = useToast()

  const [tab, setTab] = useState<'random' | 'bot' | 'invite'>('random')
  const [duration, setDuration] = useState(10)
  const [botLevel, setBotLevel] = useState('normal')
  const [friends, setFriends] = useState<any[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle')
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [onlineFriendIds, setOnlineFriendIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchFriends = async () => {
        setLoadingFriends(true)
        try {
          const authData = JSON.parse(localStorage.getItem('auth') || '{}')
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/friends`, {
            headers: { Authorization: `Bearer ${authData.token}` }
          })
          setFriends(res.data.data || [])
        } catch { setFriends([]) }
        finally { setLoadingFriends(false) }
      }
      fetchFriends()
    }
  }, [isAuthenticated, user])

  // Presence Socket Listener
  useEffect(() => {
    if (!token || friends.length === 0) return
    
    const socket = getSocket(token)
    
    const handleOnlineList = (onlineIds: string[]) => {
      setOnlineFriendIds(new Set(onlineIds))
    }
    
    const handlePresenceUpdate = (data: { userId: string, isOnline: boolean }) => {
      setOnlineFriendIds(prev => {
        const next = new Set(prev)
        if (data.isOnline) next.add(data.userId)
        else next.delete(data.userId)
        return next
      })
    }

    socket.on('presence:online_list', handleOnlineList)
    socket.on('presence:update', handlePresenceUpdate)

    socket.emit('presence:get_online', friends.map(f => f.id))

    return () => {
      socket.off('presence:online_list', handleOnlineList)
      socket.off('presence:update', handlePresenceUpdate)
    }
  }, [token, friends])

  // Socket listeners for Invitations (using singleton directly to avoid null issues)
  useEffect(() => {
    if (!isAuthenticated || !token) return

    const socket = getSocket(token)

    const handleInviteAccepted = (data: { roomCode: string, duration: number }) => {
      console.log('[ChessLobby] Invite accepted, navigating as host:', data)
      setInvitingId(null)
      sessionStorage.setItem('chessSettings', JSON.stringify({ 
        duration: data.duration, 
        mode: 'invite', 
        roomCode: data.roomCode, 
        isHost: true 
      }))
      router.push(`/game/chess/room-${data.roomCode}?duration=${data.duration}&mode=invite&isHost=true`)
    }

    const handleInviteDeclined = (data: { receiverUsername: string }) => {
      console.log('[ChessLobby] Invite declined:', data)
      setInvitingId(null)
      toast({
        title: "Undangan Ditolak",
        description: `${data.receiverUsername} menolak tantanganmu.`,
        variant: "destructive"
      })
    }

    const handleInviteTimeout = () => {
      console.log('[ChessLobby] Invite timed out')
      setInvitingId(null)
      toast({
        title: "Undangan Kedaluwarsa",
        description: "Teman tidak merespons undangan Anda.",
        variant: "destructive"
      })
    }

    const handleInviteError = (data: { message: string }) => {
      console.log('[ChessLobby] Invite error:', data)
      setInvitingId(null)
      toast({
        title: "Gagal Mengundang",
        description: data.message,
        variant: "destructive"
      })
    }

    const handleNavigate = (data: { roomCode: string, duration: number }) => {
      // For the receiver (in case lobby is open on receiver side)
      console.log('[ChessLobby] Navigate to room:', data)
      sessionStorage.setItem('chessSettings', JSON.stringify({ 
        duration: data.duration, 
        mode: 'invite', 
        roomCode: data.roomCode, 
        isHost: false 
      }))
      router.push(`/game/chess/room-${data.roomCode}?duration=${data.duration}&mode=invite`)
    }

    console.log('[ChessLobby] Attaching chess invite listeners, socket id:', socket.id)

    socket.on('chess:invite_accepted', handleInviteAccepted)
    socket.on('chess:invite_declined', handleInviteDeclined)
    socket.on('chess:invite_timeout', handleInviteTimeout)
    socket.on('chess:invite_error', handleInviteError)
    socket.on('chess:navigate_to_room', handleNavigate)

    return () => {
      socket.off('chess:invite_accepted', handleInviteAccepted)
      socket.off('chess:invite_declined', handleInviteDeclined)
      socket.off('chess:invite_timeout', handleInviteTimeout)
      socket.off('chess:invite_error', handleInviteError)
      socket.off('chess:navigate_to_room', handleNavigate)
    }
  }, [isAuthenticated, token, router, toast])

  const handleFindRandom = () => {
    setStatus('searching')
    // Simpan pengaturan ke sessionStorage lalu arahkan ke game sementara
    sessionStorage.setItem('chessSettings', JSON.stringify({ duration, mode: 'random' }))
    setTimeout(() => {
      const roomId = `chess-${Date.now()}`
      router.push(`/game/chess/${roomId}?duration=${duration}&mode=random`)
    }, 1500)
  }

  const handleBotMatch = () => {
    setStatus('searching')
    sessionStorage.setItem('chessSettings', JSON.stringify({ duration, mode: 'bot', botLevel }))
    setTimeout(() => {
      const roomId = `chess-bot-${Date.now()}`
      router.push(`/game/chess/${roomId}?duration=${duration}&mode=bot&level=${botLevel}`)
    }, 800)
  }

  const onlineFriends = friends.filter(f => onlineFriendIds.has(f.id))

  const handleInviteFriend = (friendId: string) => {
    if (!token) return
    const socket = getSocket(token)
    if (!socket.connected) {
      toast({
        title: "Tidak Terhubung",
        description: "Socket tidak terhubung. Coba refresh halaman.",
        variant: "destructive"
      })
      return
    }
    setInvitingId(friendId)
    console.log('[ChessLobby] Sending chess invite to:', friendId, 'duration:', duration)
    socket.emit('chess:invite', { receiverId: friendId, duration, mode: 'invite' }, (response: any) => {
      console.log('[ChessLobby] chess:invite callback response:', response)
      if (response?.error) {
        setInvitingId(null)
        toast({
          title: "Gagal Mengundang",
          description: response.error,
          variant: "destructive"
        })
      }
    })
  }

  if (isLoading || !isAuthenticated) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--c-bg)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slide-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes chess-pulse { 0%,100% { box-shadow:0 0 12px rgba(74,255,145,0.3); } 50% { box-shadow:0 0 28px rgba(74,255,145,0.7); } }
        .chess-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; backdrop-filter:blur(12px); }
        .dur-btn { background:rgba(255,255,255,0.04); border:2px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; gap:6px; color:var(--c-on-surface); }
        .dur-btn:hover { border-color:rgba(74,255,145,0.4); background:rgba(74,255,145,0.06); transform:translateY(-2px); }
        .dur-btn.active { border-color:#4aff91; background:rgba(74,255,145,0.1); box-shadow:0 0 16px rgba(74,255,145,0.15); animation:chess-pulse 2s infinite; }
        .tab-btn { background:none; border:none; padding:10px 20px; cursor:pointer; font-family:'Inter',sans-serif; font-weight:600; font-size:0.875rem; color:var(--c-outline); border-bottom:2px solid transparent; transition:all 0.2s; }
        .tab-btn.active { color:#4aff91; border-bottom-color:#4aff91; }
        .bot-card { background:rgba(255,255,255,0.03); border:2px solid rgba(255,255,255,0.07); border-radius:14px; padding:16px; cursor:pointer; transition:all 0.2s; flex:1; display:flex; flex-direction:column; align-items:center; gap:8px; }
        .bot-card:hover { transform:translateY(-2px); }
        .bot-card.easy.active { border-color:#4aff91; background:rgba(74,255,145,0.08); }
        .bot-card.normal.active { border-color:#feb127; background:rgba(254,177,39,0.08); }
        .bot-card.hard.active { border-color:#ff4545; background:rgba(255,69,69,0.08); }
        .btn-chess { background:linear-gradient(135deg,#4aff91,#00d1ff); border:none; border-radius:12px; padding:14px 32px; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:1rem; color:#003543; cursor:pointer; transition:all 0.2s; width:100%; }
        .btn-chess:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(74,255,145,0.4); }
        .btn-chess:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-invite-premium {
          background: linear-gradient(135deg, #00d1ff, #cf5cff);
          border: none;
          border-radius: 999px;
          padding: 8px 24px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(0, 209, 255, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 110px;
        }
        .btn-invite-premium:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(207, 92, 255, 0.4);
          filter: brightness(1.1);
        }
        .btn-invite-premium:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-invite-premium:disabled {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.3);
          box-shadow: none;
          cursor: not-allowed;
        }
      `}</style>

      {/* Background orbs */}
      <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(74,255,145,0.07) 0%, transparent 70%)', top:-200, left:-200, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,209,255,0.06) 0%, transparent 70%)', bottom:-150, right:-150, pointerEvents:'none' }} />

      {/* Header */}
      <nav className="px-4 sm:px-6 h-16 flex items-center justify-between border-b border-white/5 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="bg-transparent border-none cursor-pointer flex items-center gap-2 text-slate-400 font-['Inter'] text-sm hover:text-white transition-colors">
          <span style={{ fontSize:'1.25rem' }}>←</span>
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <span className="font-['Space_Grotesk'] font-bold text-lg sm:text-xl bg-gradient-to-r from-[#4aff91] to-[#00d1ff] bg-clip-text text-transparent">
          ♟️ Chess Arena
        </span>
        <div className="w-20" />
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', animation: 'slide-up 0.4s ease' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '2.25rem', fontWeight: 700, color: 'var(--c-on-surface)', marginBottom: 8 }}>
            ♟️ Pilih Mode Catur
          </h1>
          <p style={{ color: 'var(--c-outline)', fontFamily: "'Inter',sans-serif", fontSize: '1rem' }}>
            Selamat datang, <strong style={{ color: '#4aff91' }}>{user?.username}</strong>! Atur permainan dan tantang lawanmu.
          </p>
        </div>

        {/* Duration Selector */}
        <div className="chess-card" style={{ padding: 24, marginBottom: 24 }}>
          <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '0.875rem', color: 'var(--c-outline)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ⏱️ Durasi Permainan (per pemain)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                className={`dur-btn${duration === d.value ? ' active' : ''}`}
                onClick={() => setDuration(d.value)}
                disabled={status === 'searching'}
              >
                <span style={{ fontSize: '1.5rem' }}>{d.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: duration === d.value ? '#4aff91' : 'var(--c-on-surface)' }}>{d.label}</span>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.65rem', color: 'var(--c-outline)', textAlign: 'center' }}>{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="chess-card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button className={`tab-btn${tab === 'random' ? ' active' : ''}`} onClick={() => setTab('random')}>🎲 Acak</button>
            <button className={`tab-btn${tab === 'bot' ? ' active' : ''}`} onClick={() => setTab('bot')}>🤖 vs Bot</button>
            <button className={`tab-btn${tab === 'invite' ? ' active' : ''}`} onClick={() => setTab('invite')}>👥 Undang Teman</button>
          </div>

          <div style={{ padding: 24 }}>
            {/* Random */}
            {tab === 'random' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'rgba(74,255,145,0.05)', border: '1px solid rgba(74,255,145,0.15)', borderRadius: 12, padding: '12px 16px' }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.85rem', color: '#4aff91', fontWeight: 600, marginBottom: 4 }}>Mode Acak</p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.8rem', color: 'var(--c-outline)', lineHeight: 1.6 }}>
                    Sistem akan mencocokkanmu dengan pemain lain yang sedang menunggu dengan durasi yang sama.
                  </p>
                </div>
                <button className="btn-chess" onClick={handleFindRandom} disabled={status === 'searching'}>
                  {status === 'searching' ? '🔍 Mencari Lawan...' : '⚡ Cari Lawan Sekarang'}
                </button>
              </div>
            )}

            {/* Bot */}
            {tab === 'bot' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '0.8rem', color: 'var(--c-outline)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Level Bot
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {BOT_LEVELS.map(bot => (
                    <button
                      key={bot.id}
                      className={`bot-card ${bot.id}${botLevel === bot.id ? ' active' : ''}`}
                      onClick={() => setBotLevel(bot.id)}
                    >
                      <span style={{ fontSize: '2rem' }}>{bot.emoji}</span>
                      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: bot.color }}>{bot.label}</span>
                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: 'var(--c-outline)', textAlign: 'center' }}>{bot.desc}</span>
                    </button>
                  ))}
                </div>
                <button className="btn-chess" onClick={handleBotMatch} disabled={status === 'searching'}>
                  {status === 'searching' ? '🤖 Menyiapkan Bot...' : `🤖 Mulai vs Bot ${BOT_LEVELS.find(b => b.id === botLevel)?.emoji}`}
                </button>
              </div>
            )}

            {/* Invite */}
            {tab === 'invite' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Online friends */}
                {onlineFriends.length > 0 ? (
                  <div>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: '0.8rem', color: 'var(--c-outline)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Teman Online</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {onlineFriends.slice(0, 4).map(friend => (
                        <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#4aff91,#00d1ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#003543', fontSize: '0.9rem' }}>
                              {friend.username?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--c-on-surface)', fontSize: '0.9rem' }}>{friend.username}</span>
                          </div>
                          <button
                            onClick={() => handleInviteFriend(friend.id)}
                            disabled={invitingId !== null}
                            className="btn-invite-premium"
                          >
                            {invitingId === friend.id ? '...' : '+ INVITE'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                    <p style={{ color: 'var(--c-outline)', fontFamily: "'Inter',sans-serif" }}>Tidak ada teman yang sedang online saat ini.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Searching overlay */}
        {status === 'searching' && (
          <div className="chess-card" style={{ padding: 32, textAlign: 'center', border: '1px solid rgba(74,255,145,0.3)' }}>
            <div style={{ width: 48, height: 48, border: '4px solid rgba(74,255,145,0.2)', borderTopColor: '#4aff91', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--c-on-surface)', marginBottom: 8 }}>
              {tab === 'bot' ? '🤖 Menyiapkan Bot...' : '🔍 Mencari Lawan...'}
            </p>
            <p style={{ color: 'var(--c-outline)', fontSize: '0.875rem' }}>Durasi: {duration} menit per pemain</p>
          </div>
        )}
      </main>
    </div>
  )
}
