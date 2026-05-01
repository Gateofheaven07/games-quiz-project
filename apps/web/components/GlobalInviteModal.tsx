'use client'

import { useBattleInvite } from '../hooks/useBattleInvite'
import { motion, AnimatePresence } from 'framer-motion'

export function GlobalInviteModal() {
  const { incomingInvite, inviteTimeout, acceptInvite, declineInvite } = useBattleInvite()

  return (
    <AnimatePresence>
      {incomingInvite && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-panel w-full max-w-md overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, rgba(14,20,23,0.95), rgba(26,35,40,0.95))',
              border: '1px solid rgba(0,209,255,0.3)',
              boxShadow: '0 0 40px rgba(0,209,255,0.2)'
            }}
          >
            {/* Header / Banner */}
            <div style={{ height: 6, background: 'linear-gradient(90deg, #00d1ff, #cf5cff)' }} />
            
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚔️</div>
              
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-on-surface)', marginBottom: 8 }}>
                Tantangan Battle!
              </h2>
              
              <p style={{ fontFamily: "'Inter', sans-serif", color: 'var(--c-outline)', marginBottom: 24 }}>
                <strong style={{ color: '#00d1ff' }}>{incomingInvite.sender?.username}</strong> mengajakmu bertanding di kategori <strong style={{ color: '#cf5cff' }}>{incomingInvite.room?.categoryId === 9 ? 'Pengetahuan Umum' : 'Kuis'}</strong>.
              </p>

              {/* Countdown Timer */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 30, ease: 'linear' }}
                    style={{ height: '100%', background: inviteTimeout < 10 ? '#ff4545' : '#00d1ff' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: inviteTimeout < 10 ? '#ff4545' : 'var(--c-outline)', marginTop: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                  BERAKHIR DALAM {inviteTimeout} DETIK
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={declineInvite}
                  style={{ 
                    flex: 1, padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', 
                    background: 'rgba(255,255,255,0.05)', color: 'var(--c-on-surface)',
                    fontFamily: "'Inter', sans-serif", fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Tolak
                </button>
                <button 
                  onClick={acceptInvite}
                  style={{ 
                    flex: 1, padding: '14px', borderRadius: 12, border: 'none', 
                    background: 'linear-gradient(135deg, #00d1ff, #cf5cff)', color: '#fff',
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0,209,255,0.3)'
                  }}
                >
                  Terima
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
