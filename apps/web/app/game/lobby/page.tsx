'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useGame, BotDifficulty, BOT_DIFFICULTY_INFO } from '../../../context/GameContext'
import { usePresence } from '../../../hooks/usePresence'
import { useBattleInvite } from '../../../hooks/useBattleInvite'
import axios from 'axios'

const CATEGORIES = [
  { id: 9,  label: 'Pengetahuan Umum', icon: '🌍', color: '#00d1ff' },
  { id: 17, label: 'Sains & Alam',     icon: '🔬', color: '#4aff91' },
  { id: 18, label: 'Komputer',         icon: '💻', color: '#cf5cff' },
  { id: 19, label: 'Matematika',       icon: '📐', color: '#feb127' },
  { id: 22, label: 'Geografi',         icon: '🗺️', color: '#ff6b6b' },
  { id: 23, label: 'Sejarah',          icon: '📜', color: '#ffd700' },
]

const STATUS_MESSAGES: Record<string, string> = {
  connecting:     'Menghubungkan ke server...',
  searching:      'Mencari lawan yang setimpal...',
  opponent_found: 'Lawan ditemukan! Mempersiapkan...',
  preparing:      'Mengambil dan menerjemahkan soal...',
  ready:          'Pertandingan siap! Memasuki arena...',
  error:          'Terjadi kesalahan.',
}

const BOT_STATUS_MESSAGES: Record<string, string> = {
  searching:      'Menyiapkan Bot...',
  opponent_found: 'Bot siap! Mempersiapkan soal...',
  preparing:      'Menerjemahkan soal ke Bahasa Indonesia...',
  ready:          'Mode Latihan siap! Memasuki arena...',
}

export default function LobbyPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const {
    isConnected, matchmakingStatus, matchmakingError, gameData,
    opponentInfo, privateRoomCode,
    findRandomMatch, findBotMatch, cancelMatchmaking,
    createInviteRoom, joinByCode, resetMatchmaking,
  } = useGame()

  const [selectedCategory, setSelectedCategory]   = useState(9)
  const [tab, setTab]                             = useState<'random' | 'bot' | 'invite'>('random')
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('MEDIUM')
  const [joinCode, setJoinCode]                   = useState('')
  const [copied, setCopied]                       = useState(false)
  const [friends, setFriends]                     = useState<any[]>([])
  const [loadingFriends, setLoadingFriends]       = useState(false)

  const { onlineUsers, isOnline } = usePresence(friends)
  const { invitingId, sendInvite } = useBattleInvite()

  // Load friends
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchFriends = async () => {
        setLoadingFriends(true)
        try {
          const authData = JSON.parse(localStorage.getItem('auth') || '{}')
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/friends`, {
            headers: { Authorization: `Bearer ${authData.token}` }
          })
          setFriends(res.data.data)
        } catch (err) {
          console.error('Error fetching friends', err)
        } finally {
          setLoadingFriends(false)
        }
      }
      fetchFriends()
    }
  }, [isAuthenticated, user])

  // Redirect ke game ketika data siap
  useEffect(() => {
    if (matchmakingStatus === 'ready' && gameData) {
      sessionStorage.setItem('quizGameData', JSON.stringify(gameData))
      router.push(`/game/${gameData.roomId}`)
    }
  }, [matchmakingStatus, gameData, router])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, isLoading, router])

  const handleFindMatch = () => {
    if (!isConnected) return
    findRandomMatch(selectedCategory)
  }

  const handleFindBot = () => {
    if (!isConnected) return
    findBotMatch(selectedCategory, selectedDifficulty)
  }

  const handleCreateInvite = () => {
    if (!isConnected) return
    createInviteRoom(selectedCategory)
  }

  const handleJoinByCode = () => {
    if (!isConnected || joinCode.trim().length < 6) return
    joinByCode(joinCode.trim().toUpperCase())
  }

  const handleCopyCode = () => {
    if (!privateRoomCode) return
    navigator.clipboard.writeText(privateRoomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isSearching = ['searching', 'opponent_found', 'preparing', 'ready'].includes(matchmakingStatus)
  const isBotMode   = tab === 'bot'

  if (isLoading || !isAuthenticated) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--c-bg)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-soft { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes slide-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow-pulse { 0%,100% { box-shadow:0 0 12px rgba(74,255,145,0.3); } 50% { box-shadow:0 0 24px rgba(74,255,145,0.6); } }
        .lobby-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; backdrop-filter:blur(12px); }
        .cat-btn { background:rgba(255,255,255,0.04); border:2px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--c-on-surface); }
        .cat-btn:hover { border-color:rgba(0,209,255,0.4); background:rgba(0,209,255,0.06); transform:translateY(-2px); }
        .cat-btn.active { border-color:#00d1ff; background:rgba(0,209,255,0.1); box-shadow:0 0 16px rgba(0,209,255,0.15); }
        .tab-btn { background:none; border:none; padding:10px 20px; cursor:pointer; font-family:'Inter',sans-serif; font-weight:600; font-size:0.875rem; color:var(--c-outline); border-bottom:2px solid transparent; transition:all 0.2s; }
        .tab-btn.active { color:#00d1ff; border-bottom-color:#00d1ff; }
        .tab-btn.active.bot-tab { color:#4aff91; border-bottom-color:#4aff91; }
        .btn-primary { background:linear-gradient(135deg,#00d1ff,#cf5cff); border:none; border-radius:12px; padding:14px 32px; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:1rem; color:#fff; cursor:pointer; transition:all 0.2s; width:100%; }
        .btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,209,255,0.3); }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-bot { background:linear-gradient(135deg,#4aff91,#00d1ff); border:none; border-radius:12px; padding:14px 32px; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:1rem; color:#003543; cursor:pointer; transition:all 0.2s; width:100%; }
        .btn-bot:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(74,255,145,0.4); }
        .btn-bot:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-secondary { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:14px 32px; font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:0.9rem; color:var(--c-on-surface); cursor:pointer; transition:all 0.2s; width:100%; }
        .btn-secondary:hover:not(:disabled) { background:rgba(255,255,255,0.1); }
        .diff-btn { background:rgba(255,255,255,0.04); border:2px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px 16px; cursor:pointer; transition:all 0.25s; display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; }
        .diff-btn:hover { transform:translateY(-2px); }
        .diff-btn.easy.active  { border-color:#4aff91; background:rgba(74,255,145,0.1); box-shadow:0 0 16px rgba(74,255,145,0.2); animation:glow-pulse 2s infinite; }
        .diff-btn.medium.active{ border-color:#feb127; background:rgba(254,177,39,0.1);  box-shadow:0 0 16px rgba(254,177,39,0.2); }
        .diff-btn.hard.active  { border-color:#ff4545; background:rgba(255,69,69,0.1);   box-shadow:0 0 16px rgba(255,69,69,0.2); }
        .code-input { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:12px 16px; font-family:'Space Grotesk',sans-serif; font-size:1.2rem; font-weight:700; letter-spacing:0.2em; color:var(--c-on-surface); text-align:center; width:100%; text-transform:uppercase; outline:none; }
        .code-input:focus { border-color:#00d1ff; box-shadow:0 0 0 2px rgba(0,209,255,0.15); }
      `}</style>

      {/* Background orbs */}
      <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,209,255,0.06) 0%, transparent 70%)', top:-200, left:-200, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(207,92,255,0.06) 0%, transparent 70%)', bottom:-150, right:-150, pointerEvents:'none' }} />
      {tab === 'bot' && <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(74,255,145,0.05) 0%, transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none', transition:'opacity 0.4s' }} />}

      {/* Header */}
      <nav className="px-4 sm:px-6 h-16 flex items-center justify-between border-b border-white/5 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="bg-transparent border-none cursor-pointer flex items-center gap-2 text-slate-400 font-['Inter'] text-sm hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <span className="font-['Space_Grotesk'] font-bold text-lg sm:text-xl bg-gradient-to-r from-[#00d1ff] to-[#cf5cff] bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-none">
          ⚡ QuizBattle <span className="hidden sm:inline">Arena</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isConnected ? '#4aff91' : '#feb127', boxShadow: isConnected ? '0 0 8px #4aff91' : 'none', animation: isConnected ? 'none' : 'pulse-soft 1s infinite' }} />
          <span className="font-['Inter'] text-xs text-slate-400 hidden sm:inline">
            {isConnected ? 'Terhubung' : 'Menghubungkan...'}
          </span>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth:720, margin:'0 auto', padding:'40px 24px', animation:'slide-up 0.4s ease' }}>

        {/* Title */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2.25rem', fontWeight:700, color:'var(--c-on-surface)', marginBottom:8 }}>
            Pilih Mode Permainan
          </h1>
          <p style={{ color:'var(--c-outline)', fontFamily:"'Inter',sans-serif", fontSize:'1rem' }}>
            Selamat datang, <strong style={{ color:'#00d1ff' }}>{user?.username}</strong>! Pilih kategori dan temukan lawanmu.
          </p>
        </div>

        {/* Category Selector */}
        <div className="lobby-card" style={{ padding:24, marginBottom:24 }}>
          <p style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:'0.875rem', color:'var(--c-outline)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Pilih Kategori
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`cat-btn${selectedCategory === cat.id ? ' active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
                disabled={isSearching}
              >
                <span style={{ fontSize:'1.75rem' }}>{cat.icon}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.75rem', fontWeight:600, textAlign:'center', lineHeight:1.3 }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="lobby-card" style={{ padding:0, marginBottom:24, overflow:'hidden' }}>
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <button className={`tab-btn${tab === 'random' ? ' active' : ''}`} onClick={() => setTab('random')}>
              🎲 Acak
            </button>
            <button className={`tab-btn bot-tab${tab === 'bot' ? ' active bot-tab' : ''}`} onClick={() => setTab('bot')}>
              🤖 vs Bot
            </button>
            <button className={`tab-btn${tab === 'invite' ? ' active' : ''}`} onClick={() => setTab('invite')}>
              👥 Undang Teman
            </button>
          </div>

          <div style={{ padding:24 }}>
            {/* ── Tab: Random ── */}
            {tab === 'random' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <p style={{ fontFamily:"'Inter',sans-serif", color:'var(--c-outline)', fontSize:'0.875rem', marginBottom:4 }}>
                  Sistem akan mencocokkan kamu dengan pemain lain yang sedang mencari lawan di kategori yang sama.
                </p>
                <button className="btn-primary" onClick={handleFindMatch} disabled={!isConnected || isSearching}>
                  {isSearching ? '🔍 Sedang Mencari...' : '⚡ Cari Lawan Sekarang'}
                </button>
              </div>
            )}

            {/* ── Tab: vs Bot ── */}
            {tab === 'bot' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {/* Info card */}
                <div style={{ background:'rgba(74,255,145,0.06)', border:'1px solid rgba(74,255,145,0.2)', borderRadius:12, padding:'12px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:'1.25rem' }}>📊</span>
                  <div>
                    <p style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.8rem', color:'#4aff91', fontWeight:600, marginBottom:2 }}>Mode Latihan (vs Bot)</p>
                    <p style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.75rem', color:'var(--c-outline)', lineHeight:1.5 }}>
                      Skor akan disimpan di kategori <strong style={{ color:'var(--c-on-surface-variant)' }}>Latihan</strong> dan tidak mempengaruhi leaderboard utama (Global).
                    </p>
                  </div>
                </div>

                {/* Difficulty selector */}
                <div>
                  <p style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:'0.8125rem', color:'var(--c-outline)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    Tingkat Kesulitan Bot
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {(Object.entries(BOT_DIFFICULTY_INFO) as [BotDifficulty, typeof BOT_DIFFICULTY_INFO[BotDifficulty]][]).map(([key, info]) => (
                      <button
                        key={key}
                        className={`diff-btn ${key.toLowerCase()}${selectedDifficulty === key ? ' active' : ''}`}
                        onClick={() => setSelectedDifficulty(key)}
                        disabled={isSearching}
                      >
                        <span style={{ fontSize:'1.5rem' }}>{info.emoji}</span>
                        <span style={{
                          fontFamily:"'Space Grotesk',sans-serif",
                          fontWeight:700,
                          fontSize:'0.875rem',
                          color: key === 'EASY' ? '#4aff91' : key === 'MEDIUM' ? '#feb127' : '#ff4545',
                        }}>
                          {info.label}
                        </span>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.65rem', color:'var(--c-outline)', textAlign:'center', lineHeight:1.4 }}>
                          {info.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bot stats preview */}
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'12px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.75rem', color:'var(--c-outline)' }}>Akurasi Bot</span>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.875rem', color: selectedDifficulty === 'EASY' ? '#4aff91' : selectedDifficulty === 'MEDIUM' ? '#feb127' : '#ff4545' }}>
                      {selectedDifficulty === 'EASY' ? '40%' : selectedDifficulty === 'MEDIUM' ? '65%' : '90%'}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.75rem', color:'var(--c-outline)' }}>Kecepatan Respons</span>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.875rem', color:'var(--c-on-surface-variant)' }}>
                      {selectedDifficulty === 'EASY' ? '5–8 dtk' : selectedDifficulty === 'MEDIUM' ? '3–5 dtk' : '1–3 dtk'}
                    </span>
                  </div>
                </div>

                <button className="btn-bot" onClick={handleFindBot} disabled={!isConnected || isSearching}>
                  {isSearching ? '🤖 Menyiapkan Bot...' : `🤖 Mulai Latihan vs Bot ${BOT_DIFFICULTY_INFO[selectedDifficulty].emoji}`}
                </button>
              </div>
            )}

            {/* ── Tab: Invite ── */}
            {tab === 'invite' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <p style={{ fontFamily:"'Inter',sans-serif", color:'var(--c-outline)', fontSize:'0.85rem', marginBottom:4 }}>
                  Undang teman yang sedang online untuk bertanding secara langsung.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {friends.filter(f => isOnline(f.id)).map(friend => (
                    <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#003543' }}>
                            {friend.username.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#4aff91', border: '2px solid #1a2328' }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--c-on-surface)', fontSize: '0.9375rem' }}>{friend.username}</p>
                          <p style={{ color: 'var(--c-outline)', fontSize: '0.75rem' }}>Level {friend.level}</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => sendInvite(friend.id, selectedCategory)}
                        disabled={invitingId === friend.id}
                        className="btn-primary" 
                        style={{ 
                          width: 'auto', padding: '8px 16px', fontSize: '0.8125rem',
                          background: invitingId === friend.id ? 'rgba(255,255,255,0.1)' : undefined,
                          color: invitingId === friend.id ? 'var(--c-outline)' : undefined,
                          border: invitingId === friend.id ? '1px solid rgba(255,255,255,0.1)' : 'none'
                        }}
                      >
                        {invitingId === friend.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#00d1ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            Menunggu...
                          </div>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add</span>
                            Invite
                          </span>
                        )}
                      </button>
                    </div>
                  ))}

                  {friends.filter(f => isOnline(f.id)).length === 0 && !loadingFriends && (
                    <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <p style={{ color: 'var(--c-outline)', fontSize: '0.875rem' }}>Tidak ada teman yang online saat ini.</p>
                    </div>
                  )}

                  {loadingFriends && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <div style={{ width: 24, height: 24, border: '3px solid rgba(0,209,255,0.2)', borderTopColor: '#00d1ff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                    </div>
                  )}
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />

                {/* Optional: Keep old room code logic as fallback? User said "menggantikan", so I'll move it to a sub-section or hide it. */}
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ color: 'var(--c-outline)', fontSize: '0.75rem', padding: '4px 0' }}>Gunakan Kode Ruangan (Lama)</summary>
                  <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:12 }}>
                    <div>
                      <p style={{ fontFamily:"'Inter',sans-serif", color:'var(--c-outline)', fontSize:'0.75rem', marginBottom:8 }}>Buat room:</p>
                      {privateRoomCode ? (
                        <div className="flex gap-2">
                          <div style={{ flex: 1, background:'rgba(0,209,255,0.1)', border:'1px solid rgba(0,209,255,0.3)', borderRadius:8, padding:10, textAlign:'center', color:'#00d1ff', fontWeight:700, letterSpacing:4 }}>{privateRoomCode}</div>
                          <button onClick={handleCopyCode} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:8, padding:'0 12px', color:'#00d1ff' }}>{copied ? '✓' : '📋'}</button>
                        </div>
                      ) : (
                        <button className="btn-secondary" onClick={handleCreateInvite} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Buat Kode</button>
                      )}
                    </div>
                    <div>
                      <p style={{ fontFamily:"'Inter',sans-serif", color:'var(--c-outline)', fontSize:'0.75rem', marginBottom:8 }}>Gabung kode:</p>
                      <div style={{ display:'flex', gap:8 }}>
                        <input className="code-input" style={{ fontSize: '0.9rem', padding: 8 }} placeholder="XXXXXX" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} />
                        <button onClick={handleJoinByCode} className="btn-primary" style={{ width: 'auto', padding: '0 16px', fontSize: '0.8rem' }}>Masuk</button>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Status / Progress overlay */}
        {isSearching && (
          <div className="lobby-card" style={{ padding:32, textAlign:'center', animation:'slide-up 0.3s ease', border: isBotMode ? '1px solid rgba(74,255,145,0.3)' : '1px solid rgba(0,209,255,0.2)' }}>
            {matchmakingStatus === 'opponent_found' || matchmakingStatus === 'preparing' || matchmakingStatus === 'ready' ? (
              <div style={{ fontSize:'3rem', marginBottom:16 }}>{isBotMode ? '🤖' : '🎯'}</div>
            ) : (
              <div style={{ width:48, height:48, border:`4px solid ${isBotMode ? 'rgba(74,255,145,0.2)' : 'rgba(0,209,255,0.2)'}`, borderTopColor: isBotMode ? '#4aff91' : '#00d1ff', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
            )}

            {opponentInfo && (
              <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', color: isBotMode ? '#4aff91' : '#00d1ff', marginBottom:4 }}>
                vs <strong>{opponentInfo.username}</strong>
              </p>
            )}

            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color:'var(--c-on-surface)', marginBottom:8 }}>
              {(isBotMode ? BOT_STATUS_MESSAGES[matchmakingStatus] : STATUS_MESSAGES[matchmakingStatus]) || ''}
            </p>

            {isBotMode && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(74,255,145,0.1)', border:'1px solid rgba(74,255,145,0.2)', borderRadius:8, padding:'4px 12px', marginBottom:12 }}>
                <span style={{ fontSize:'0.75rem' }}>{BOT_DIFFICULTY_INFO[selectedDifficulty].emoji}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.75rem', color:'#4aff91', fontWeight:600 }}>
                  Kesulitan: {BOT_DIFFICULTY_INFO[selectedDifficulty].label}
                </span>
              </div>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'center', margin:'16px 0' }}>
              {['searching','opponent_found','preparing','ready'].map((s, i) => (
                <div key={s} style={{ width:8, height:8, borderRadius:'50%', backgroundColor: ['searching','opponent_found','preparing','ready'].indexOf(matchmakingStatus) >= i ? (isBotMode ? '#4aff91' : '#00d1ff') : 'rgba(255,255,255,0.1)', transition:'background-color 0.3s', boxShadow: ['searching','opponent_found','preparing','ready'].indexOf(matchmakingStatus) >= i ? (isBotMode ? '0 0 6px #4aff91' : '0 0 6px #00d1ff') : 'none' }} />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {matchmakingStatus === 'error' && matchmakingError && (
          <div style={{ background:'rgba(255,69,69,0.1)', border:'1px solid rgba(255,69,69,0.3)', borderRadius:12, padding:20, textAlign:'center', animation:'slide-up 0.3s ease' }}>
            <p style={{ color:'#ff4545', fontFamily:"'Inter',sans-serif", marginBottom:12 }}>⚠️ {matchmakingError}</p>
            <button onClick={resetMatchmaking} className="btn-secondary" style={{ width:'auto', padding:'8px 24px' }}>
              Coba Lagi
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
