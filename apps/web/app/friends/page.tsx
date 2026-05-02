'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { useNotificationContext } from '../../context/NotificationContext'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../../lib/socketSingleton'
import { AppSidebar, AppMobileNav } from '../../components/AppSidebar'
// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Friend {
  id: string
  username: string
  level: number
  wins: number
  totalScore: number
  friendshipId: string
  isOnline?: boolean
}

interface RequestItem {
  id: string
  sender: {
    id: string
    username: string
    level: number
    wins: number
  }
  createdAt: string
}

interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  sender: {
    id: string
    username: string
  }
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function FriendsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, getAuthClient, logout } = useAuth()
  const { setFriendRequestCount } = useNotificationContext()
  
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Reset notification count when entering this page
  useEffect(() => {
    if (isAuthenticated) {
      setFriendRequestCount(0)
    }
  }, [isAuthenticated, setFriendRequestCount])

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  const [activeChat, setActiveChat] = useState<Friend | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFriendsData()
      setupSocket()
    }
    return () => {
      if (socket) socket.disconnect()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const setupSocket = () => {
    const authDataStr = localStorage.getItem('auth')
    if (!authDataStr) return
    const authData = JSON.parse(authDataStr)
    
    const newSocket = io(SOCKET_URL, {
      auth: { token: authData.token }
    })

    newSocket.on('connect', () => {
      console.log('Socket connected for friends UI')
      // Ask for online presence once connected and we have friends loaded
    })

    newSocket.on('presence:online_list', (onlineIds: string[]) => {
      setOnlineUsers(new Set(onlineIds))
    })

    newSocket.on('presence:update', (data: { userId: string, isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        if (data.isOnline) next.add(data.userId)
        else next.delete(data.userId)
        return next
      })
    })

    newSocket.on('chat:message', (message: ChatMessage) => {
      setChatMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === message.id)) return prev
        return [...prev, message]
      })
    })

    newSocket.on('friend:request', (request: RequestItem) => {
      setRequests(prev => {
        if (prev.some(r => r.id === request.id)) return prev
        return [request, ...prev]
      })
      // Since we are on the friends page, we can keep the global count at 0
      setFriendRequestCount(0)
    })

    setSocket(newSocket)
  }

  // Refresh online list once friends are loaded
  useEffect(() => {
    if (socket && friends.length > 0) {
      socket.emit('presence:get_online', friends.map(f => f.id))
    }
  }, [friends, socket])

  const loadFriendsData = async () => {
    try {
      const client = getAuthClient()
      const [friendsRes, requestsRes] = await Promise.all([
        client.get('/friends'),
        client.get('/friends/requests')
      ])
      
      setFriends(friendsRes.data.data)
      setRequests(requestsRes.data.data)
    } catch (err) {
      console.error('Error loading friends', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddStatus(null)
    try {
      const client = getAuthClient()
      await client.post('/friends/request', { username: addUsername })
      setAddStatus({ type: 'success', msg: 'Permintaan pertemanan terkirim!' })
      setAddUsername('')
    } catch (err: any) {
      setAddStatus({ type: 'error', msg: err.response?.data?.error || 'Gagal mengirim permintaan' })
    }
  }

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const client = getAuthClient()
      await client.post(`/friends/accept/${friendshipId}`)
      loadFriendsData()
    } catch (err) {
      console.error('Error accepting request', err)
    }
  }

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      const client = getAuthClient()
      await client.delete(`/friends/${friendshipId}`)
      loadFriendsData()
    } catch (err) {
      console.error('Error rejecting request', err)
    }
  }

  const openChat = async (friend: Friend) => {
    setActiveChat(friend)
    try {
      const client = getAuthClient()
      const res = await client.get(`/friends/messages/${friend.id}`)
      setChatMessages(res.data.data)
    } catch (err) {
      console.error('Error loading chat history', err)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat || !socket) return

    socket.emit('chat:send', { receiverId: activeChat.id, content: newMessage.trim() })
    setNewMessage('')
  }

  const createBattleRoom = async (friend: Friend) => {
    try {
      const client = getAuthClient()
      const res = await client.post(`/friends/battle/${friend.id}`)
      const { inviteCode } = res.data.data
      
      // Also send a chat message with the invite code
      if (socket) {
        socket.emit('chat:send', { 
          receiverId: friend.id, 
          content: `Aku menantangmu bertarung! Kode ruangan: ${inviteCode}` 
        })
      }
      
      router.push(`/game?room=${inviteCode}`)
    } catch (err) {
      console.error('Error creating battle room', err)
      alert('Gagal membuat ruangan pertempuran')
    }
  }

  if (isLoading || !isAuthenticated || loading) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--c-bg)' }} />

  const onlineFriends = friends.filter(f => onlineUsers.has(f.id))
  const offlineFriends = friends.filter(f => !onlineUsers.has(f.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--c-bg)', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        
        .chat-bubble {
          padding: 12px 16px;
          border-radius: 12px;
          max-width: 80%;
          font-size: 0.9375rem;
          line-height: 1.4;
        }
        .chat-sent {
          background: rgba(0, 209, 255, 0.15);
          border: 1px solid rgba(0, 209, 255, 0.3);
          border-bottom-right-radius: 4px;
          align-self: flex-end;
          color: var(--c-primary-fixed-dim);
        }
        .chat-received {
          background: var(--c-surface-high);
          border: 1px solid var(--c-outline-variant);
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          color: var(--c-on-surface);
        }
      `}</style>

      {/* Background orbs */}
      <div className="bg-orb bg-orb-blue" style={{ top: -100, right: 200 }} />
      <div className="bg-orb bg-orb-purple" style={{ bottom: 0, left: 100 }} />

      <AppMobileNav active="Teman" />

      <div className="flex flex-col lg:flex-row flex-1">
        <AppSidebar active="Teman" />

        <main className="flex-1 lg:ml-72 p-4 sm:p-8 relative z-10 flex flex-col gap-6 overflow-x-hidden">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <p className="label-caps" style={{ color: 'var(--c-secondary-container)', marginBottom: 4 }}>
                Pusat Sosial
              </p>
              <h2 className="text-xl sm:text-2xl" style={{ color: 'var(--c-on-surface)', fontFamily: "'Space Grotesk', sans-serif" }}>
                Terhubung dengan Operator Elit
              </h2>
            </div>
            <button className="btn-primary w-full sm:w-auto justify-center whitespace-nowrap text-sm sm:text-base px-4 py-3 sm:px-6 sm:py-3" onClick={() => setShowAddModal(true)}>
              <span className="material-symbols-rounded">person_add</span>
              <span>Tambah Teman</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 w-full">
            
            {/* Left Column: Friends List */}
            <div className="glass-panel lg:col-span-2 p-4 sm:p-6 flex flex-col overflow-hidden">
              
              {/* Online Friends */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: 'var(--c-on-surface)', fontSize: '1.125rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4aff91', boxShadow: '0 0 8px #4aff91' }} />
                  Teman Online ({onlineFriends.length})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {onlineFriends.map(friend => (
                    <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--c-surface)', borderRadius: '0.75rem', border: '1px solid var(--c-outline-variant)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003543', fontWeight: 'bold', fontSize: '1.25rem' }}>
                            {friend.username.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#4aff91', border: '2px solid var(--c-surface)' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ fontWeight: 600, color: 'var(--c-on-surface)', fontSize: '1.0625rem' }}>{friend.username}</p>
                            <span className="badge badge-primary">Lv {friend.level}</span>
                          </div>
                          <p style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.875rem' }}>{friend.wins} Menang | {friend.totalScore} Skor</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openChat(friend)} className="btn-ghost" style={{ padding: '0.5rem', minWidth: 'auto' }}>
                          <span className="material-symbols-rounded">chat</span>
                        </button>
                        <button onClick={() => createBattleRoom(friend)} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                          Tantang
                        </button>
                      </div>
                    </div>
                  ))}
                  {onlineFriends.length === 0 && (
                    <p style={{ color: 'var(--c-on-surface-variant)', fontStyle: 'italic', padding: 16 }}>Tidak ada teman yang online saat ini.</p>
                  )}
                </div>
              </div>

              {/* Offline Friends */}
              <div>
                <h3 style={{ color: 'var(--c-on-surface-variant)', fontSize: '1.125rem', marginBottom: 16 }}>
                  Teman Offline ({offlineFriends.length})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {offlineFriends.map(friend => (
                    <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--c-surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-on-surface-variant)', fontWeight: 'bold' }}>
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--c-on-surface-variant)', fontSize: '1rem' }}>{friend.username}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openChat(friend)} className="btn-ghost" style={{ padding: '0.4rem', border: 'none', color: 'var(--c-on-surface-variant)' }}>
                          <span className="material-symbols-rounded">chat</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Pending Requests & Activity */}
            <div className="flex flex-col gap-6">
              
              {/* Pending Requests */}
              <div className="glass-panel p-4 sm:p-6">
                <h3 style={{ color: 'var(--c-on-surface)', fontSize: '1rem', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  Permintaan Tertunda
                  {requests.length > 0 && <span className="badge badge-secondary">{requests.length}</span>}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {requests.map(req => (
                    <div key={req.id} style={{ background: 'var(--c-surface)', padding: 16, borderRadius: '0.75rem', border: '1px solid var(--c-outline-variant)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003543', fontWeight: 'bold' }}>
                          {req.sender.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--c-on-surface)' }}>{req.sender.username}</p>
                          <p style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.75rem' }}>Level {req.sender.level}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAcceptRequest(req.id)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', flex: 1, justifyContent: 'center' }}>Terima</button>
                        <button onClick={() => handleRejectRequest(req.id)} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', flex: 1, justifyContent: 'center' }}>Abaikan</button>
                      </div>
                    </div>
                  ))}
                  {requests.length === 0 && (
                    <p style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.875rem' }}>Tidak ada permintaan tertunda.</p>
                  )}
                </div>
              </div>

              {/* Global Ranking Hint */}
              <div className="glass-panel p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(0,209,255,0.06), rgba(207,92,255,0.06))', border: '1px solid rgba(0,209,255,0.2)' }}>
                <p className="label-caps" style={{ color: 'var(--c-primary-container)', marginBottom: 8 }}>Papan Peringkat Global</p>
                <p style={{ color: 'var(--c-on-surface)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
                  Kamu saat ini berada di peringkat <strong style={{ color: '#cf5cff' }}>#1.204</strong> secara global. Tantang teman untuk naik lebih tinggi di peringkat.
                </p>
                <Link href="/leaderboard" style={{ display: 'inline-block', marginTop: 12, color: 'var(--c-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
                  Lihat Peringkat →
                </Link>
              </div>

            </div>
          </div>
        </div>

        {/* Chat Drawer / Modal */}
        {activeChat && (
          <div 
            className="glass-panel fixed sm:absolute sm:right-8 sm:bottom-8 w-full sm:w-[380px] h-[60vh] sm:h-[500px] z-[100] flex flex-col bottom-0 left-0 sm:left-auto" 
            style={{ 
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
              backgroundColor: 'var(--c-surface)',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0
            }}
          >
            {/* Header */}
            <div style={{ padding: 16, borderBottom: '1px solid var(--c-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--c-surface-high)', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003543', fontWeight: 'bold' }}>
                    {activeChat.username.charAt(0).toUpperCase()}
                  </div>
                  {onlineUsers.has(activeChat.id) && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#4aff91', border: '2px solid var(--c-surface)' }} />}
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--c-on-surface)', fontSize: '0.9375rem' }}>{activeChat.username}</p>
                  <p style={{ color: 'var(--c-on-surface-variant)', fontSize: '0.75rem' }}>
                    {onlineUsers.has(activeChat.id) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', color: 'var(--c-on-surface-variant)', cursor: 'pointer' }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map(msg => {
                const isMine = msg.senderId === user?.id
                return (
                  <div key={msg.id} className={`chat-bubble ${isMine ? 'chat-sent' : 'chat-received'}`}>
                    {msg.content}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="sm:rounded-b-2xl" style={{ padding: 16, borderTop: '1px solid var(--c-outline-variant)', display: 'flex', gap: 8, background: 'var(--c-surface-high)' }}>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ketik pesan..." 
                className="input-field"
                style={{ padding: '0.5rem 1rem' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem', minWidth: 'auto', borderRadius: '0.5rem' }}>
                <span className="material-symbols-rounded">send</span>
              </button>
            </form>
          </div>
        )}

      </main>
      </div>

      {/* Add Friend Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ width: 400, position: 'relative' }}>
            <button 
              onClick={() => { setShowAddModal(false); setAddStatus(null); setAddUsername('') }} 
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--c-on-surface-variant)', cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
            
            <h2 style={{ color: 'var(--c-primary-container)', marginBottom: 8, fontSize: '1.5rem', fontFamily: "'Space Grotesk', sans-serif" }}>Tambah Operator</h2>
            <p style={{ color: 'var(--c-on-surface-variant)', marginBottom: 24, fontSize: '0.875rem' }}>
              Masukkan username yang tepat untuk mengirim permintaan pertemanan.
            </p>

            <form onSubmit={handleAddFriend}>
              <div style={{ marginBottom: 16 }}>
                <input 
                  type="text" 
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Username Operator" 
                  className="input-field"
                  required
                />
              </div>

              {addStatus && (
                <div style={{ 
                  padding: 12, 
                  borderRadius: 8, 
                  marginBottom: 16, 
                  fontSize: '0.875rem',
                  background: addStatus.type === 'success' ? 'rgba(74, 255, 145, 0.1)' : 'rgba(255, 69, 69, 0.1)',
                  color: addStatus.type === 'success' ? '#4aff91' : '#ff4545',
                  border: `1px solid ${addStatus.type === 'success' ? '#4aff91' : '#ff4545'}`
                }}>
                  {addStatus.msg}
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Kirim Permintaan
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
