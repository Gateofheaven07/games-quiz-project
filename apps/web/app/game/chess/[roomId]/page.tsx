'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../hooks/useAuth'
import { getSocket } from '../../../../lib/socketSingleton'
import { useToast } from '../../../../hooks/use-toast'

// ── Chess Types ──────────────────────────────────────────────────────────────
type PieceType = 'K'|'Q'|'R'|'B'|'N'|'P'
type Color = 'w'|'b'
interface Piece { type: PieceType; color: Color }
type Square = Piece | null
type Board = Square[][]

// Helper to flip the board for black player
function getDisplayBoard(board: Board, playerColor: Color): Board {
  if (playerColor === 'w') return board;
  // Reverse rows and reverse each row's squares
  return [...board].reverse().map(row => [...row].reverse());
}

// Wikimedia Chess Pieces SVGs
const PIECE_URLS: Record<string, string> = {
  wK: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  wQ: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  wR: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  wB: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  wN: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  wP: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  bK: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  bQ: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  bR: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  bB: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  bN: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  bP: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
}

const PIECE_UNICODE: Record<string, string> = {
  wK:'♔', wQ:'♕', wB:'♗', wN:'♘', wR:'♖', wP:'♙',
  bK:'♚', bQ:'♛', bB:'♝', bN:'♞', bR:'♜', bP:'♟',
}

function PieceIcon({ type, color, size = 40 }: { type: PieceType, color: Color, size?: number }) {
  const pieceKey = `${color}${type}`
  const url = PIECE_URLS[pieceKey]
  
  if (!url) return null

  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        backgroundImage: `url("${url}")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
      }}
    />
  )
}

function initBoard(): Board {
  const e = null
  const row = (color: Color, order: PieceType[]) => order.map(t => ({ type: t, color }))
  const pawns = (color: Color) => Array(8).fill({ type: 'P' as PieceType, color })
  const back: PieceType[] = ['R','N','B','Q','K','B','N','R']
  return [
    row('b', back), pawns('b'),
    Array(8).fill(e), Array(8).fill(e), Array(8).fill(e), Array(8).fill(e),
    pawns('w'), row('w', back),
  ]
}

function getLegalMoves(board: Board, row: number, col: number): [number,number][] {
  const piece = board[row][col]
  if (!piece) return []
  const moves: [number,number][] = []
  const inBounds = (r:number,c:number) => r>=0&&r<8&&c>=0&&c<8
  const add = (r:number,c:number) => { if(inBounds(r,c) && board[r][c]?.color !== piece.color) moves.push([r,c]) }
  const slide = (dr:number,dc:number) => { let r=row+dr,c=col+dc; while(inBounds(r,c)){if(board[r][c]){if(board[r][c]!.color!==piece.color)moves.push([r,c]);break}moves.push([r,c]);r+=dr;c+=dc} }

  switch(piece.type){
    case 'P': {
      const dir = piece.color==='w'?-1:1
      const start = piece.color==='w'?6:1
      if(inBounds(row+dir,col)&&!board[row+dir][col]) { moves.push([row+dir,col]); if(row===start&&!board[row+2*dir][col]) moves.push([row+2*dir,col]) }
      if(inBounds(row+dir,col-1)&&board[row+dir][col-1]&&board[row+dir][col-1]!.color!==piece.color) moves.push([row+dir,col-1])
      if(inBounds(row+dir,col+1)&&board[row+dir][col+1]&&board[row+dir][col+1]!.color!==piece.color) moves.push([row+dir,col+1])
      break
    }
    case 'N': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(row+dr,col+dc)); break
    case 'B': [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); break
    case 'R': [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); break
    case 'Q': [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); break
    case 'K': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(row+dr,col+dc)); break
  }
  return moves
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChessGamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading, user, token } = useAuth()

  const [board, setBoard] = useState<Board>(initBoard)
  const [selected, setSelected] = useState<[number,number]|null>(null)
  const [legalMoves, setLegalMoves] = useState<[number,number][]>([])
  const [turn, setTurn] = useState<Color>('w')
  const [gameState, setGameState] = useState<'playing'|'win'|'lose'|'draw'>('playing')
  const [gameOverReason, setGameOverReason] = useState<string>('')
  const [showSurrenderModal, setShowSurrenderModal] = useState(false)
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [drawOfferedBy, setDrawOfferedBy] = useState<string|null>(null)
  const [capturedW, setCapturedW] = useState<Piece[]>([])
  const [capturedB, setCapturedB] = useState<Piece[]>([])

  // Settings from sessionStorage
  const [settings, setSettings] = useState({ duration: 10, mode: 'bot', botLevel: 'normal', isHost: true })
  const [playerColor, setPlayerColor] = useState<Color>('w')

  // Timers (seconds)
  const [timeW, setTimeW] = useState(600)
  const [timeB, setTimeB] = useState(600)
  const timerRef = useRef<NodeJS.Timeout|null>(null)

  const opponentName = settings.mode === 'bot'
    ? `ChessBot [${settings.botLevel === 'easy' ? 'Mudah' : settings.botLevel === 'hard' ? 'Sulit' : 'Normal'}]`
    : 'Lawan'

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    // Get settings from sessionStorage
    const raw = sessionStorage.getItem('chessSettings')
    let isHost = true;
    
    if (raw) {
      const s = JSON.parse(raw)
      setSettings(s)
      const secs = (s.duration || 10) * 60
      setTimeW(secs); setTimeB(secs)
      isHost = s.isHost
    }

    // Fallback/Override from URL params for robustness
    const url = new URL(window.location.href)
    const hostParam = url.searchParams.get('isHost')
    if (hostParam !== null) {
      isHost = hostParam === 'true'
    }

    // Final color assignment
    const color = isHost ? 'w' : 'b'
    console.log('[Chess] Initializing game as:', color === 'w' ? 'WHITE (Host)' : 'BLACK (Guest)')
    setPlayerColor(color)
  }, [])

  // Socket sync
  useEffect(() => {
    if (!isAuthenticated || !token || settings.mode !== 'invite') return
    const socket = getSocket(token)

    socket.emit('chess:join_room', { roomCode: roomId })

    const handleOpponentMove = (data: any) => {
      console.log('[Chess] Received opponent move:', data)
      setBoard(data.board)
      setTurn(data.turn)
      setCapturedW(data.capturedW)
      setCapturedB(data.capturedB)
    }

    socket.on('chess:surrender', (data: { playerRole: string }) => {
        // If the one who surrendered is NOT us, then we win
        const weAreHost = settings.isHost
        const surrenderedIsHost = data.playerRole === 'host'
        const weWin = weAreHost !== surrenderedIsHost
        
        setGameState(weWin ? 'win' : 'lose')
        setGameOverReason('Lawan Menyerah')
      })

      socket.on('chess:offer_draw', (data: { from: string }) => {
        setDrawOfferedBy(data.from)
        setShowDrawModal(true)
      })

      socket.on('chess:accept_draw', () => {
        setGameState('draw')
        setGameOverReason('Remis Disetujui')
        setShowDrawModal(false)
      })

    socket.on('chess:move', handleOpponentMove)

    return () => {
      socket.off('chess:move', handleOpponentMove)
      socket.off('chess:surrender')
      socket.off('chess:offer_draw')
      socket.off('chess:accept_draw')
    }
  }, [isAuthenticated, token, roomId, settings.mode, settings.isHost])

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      if (turn === 'w') {
        setTimeW(t => {
          if (t <= 1) { setGameState('lose'); setGameOverReason('Waktu Habis'); return 0 }
          return t - 1
        })
      } else {
        setTimeB(t => {
          if (t <= 1) { setGameState('win'); setGameOverReason('Waktu Habis'); return 0 }
          return t - 1
        })
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [turn, gameState])

  // Simple bot move
  useEffect(() => {
    if (turn !== 'b' || gameState !== 'playing' || settings.mode !== 'bot') return
    const delay = settings.botLevel === 'easy' ? 1500 : settings.botLevel === 'hard' ? 500 : 900
    const t = setTimeout(() => makeBotMove(), delay)
    return () => clearTimeout(t)
  }, [turn, gameState])

  const makeBotMove = useCallback(() => {
    setBoard(prev => {
      const newBoard = prev.map(r => [...r])
      const allMoves: [number,number,number,number][] = []
      for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
        if (newBoard[r][c]?.color === 'b') {
          getLegalMoves(newBoard,r,c).forEach(([tr,tc]) => allMoves.push([r,c,tr,tc]))
        }
      }
      if (!allMoves.length) return prev
      // Prioritize captures
      const captures = allMoves.filter(([,,tr,tc]) => newBoard[tr][tc])
      const move = captures.length && settings.botLevel !== 'easy'
        ? captures[Math.floor(Math.random()*captures.length)]
        : allMoves[Math.floor(Math.random()*allMoves.length)]
      const [fr,fc,tr2,tc2] = move
      if (newBoard[tr2][tc2]) {
        const piece = newBoard[tr2][tc2]!
        setCapturedW(p => [...p, { type: piece.type, color: piece.color }])
      }
      newBoard[tr2][tc2] = newBoard[fr][fc]
      newBoard[fr][fc] = null
      return newBoard
    })
    setTurn('w')
  }, [settings.botLevel])

  const handleSquareClick = (row: number, col: number) => {
    if (gameState !== 'playing' || turn !== playerColor) return
    const piece = board[row][col]
    if (selected) {
      const isLegal = legalMoves.some(([r,c]) => r===row && c===col)
      if (isLegal) {
        const newBoard = board.map(r => [...r])
        let newCapturedW = [...capturedW]
        let newCapturedB = [...capturedB]
        
        if (newBoard[row][col]) {
          const piece = newBoard[row][col]!
          if (turn === 'w') setCapturedB(p => [...p, { type: piece.type, color: piece.color }])
          else setCapturedW(p => [...p, { type: piece.type, color: piece.color }])
        }

        newBoard[row][col] = newBoard[selected[0]][selected[1]]
        newBoard[selected[0]][selected[1]] = null
        
        const nextTurn = turn === 'w' ? 'b' : 'w'
        
        setBoard(newBoard)
        setCapturedW(newCapturedW)
        setCapturedB(newCapturedB)
        setSelected(null)
        setLegalMoves([])
        setTurn(nextTurn)

        // Sync via socket if in invite mode
        if (settings.mode === 'invite' && token) {
          getSocket(token).emit('chess:move', {
            roomCode: roomId,
            from: selected,
            to: [row, col],
            board: newBoard,
            turn: nextTurn,
            capturedW: newCapturedW,
            capturedB: newCapturedB
          })
        }
        return
      }
      setSelected(null); setLegalMoves([])
    }
    if (piece && piece.color === playerColor) {
      setSelected([row, col])
      setLegalMoves(getLegalMoves(board, row, col))
    }
  }

  const handleSurrender = () => {
    if (gameState !== 'playing') return
    if (!token) return
    const socket = getSocket(token)
    const role = settings.isHost ? 'host' : 'guest'
    socket.emit('chess:surrender', { roomId, playerRole: role })
    setGameState('lose')
    setGameOverReason('Anda Menyerah')
    setShowSurrenderModal(false)
  }

  const handleOfferDraw = () => {
    if (settings.mode === 'bot') {
      if (settings.botLevel === 'easy') {
        setGameState('draw'); setGameOverReason('Remis Disetujui')
      } else {
        setShowDrawModal(false)
        alert('Bot menolak tawaran remis!')
      }
    } else if (token) {
      getSocket(token).emit('chess:offer_draw', { roomId, from: user?.username || 'Lawan' })
      toast({ title: "Tawaran Terkirim", description: "Menunggu jawaban lawan..." })
    }
    setShowDrawModal(false)
  }

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  if (isLoading || !isAuthenticated) return null

  // ── RESULT SCREEN ──────────────────────────────────────────────────────────
  if (gameState !== 'playing') {
    return (
      <div className="game-over-overlay" style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:24, padding:24 }}>
        <div style={{ fontSize:'5rem' }}>{gameState === 'draw' ? '🤝' : gameState === 'win' ? '🏆' : '💀'}</div>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'3rem', fontWeight:700, color: gameState === 'draw'?'#feb127':gameState === 'win'?'#4aff91':'#ff4545', textAlign:'center' }}>
          {gameState === 'draw' ? 'REMIS!' : gameState === 'win' ? 'KAMU MENANG!' : 'KAMU KALAH!'}
        </h1>
        <p style={{ color:'var(--c-outline)', fontFamily:"'Inter',sans-serif" }}>Alasan: {gameOverReason}</p>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => router.push('/game/chess/lobby')} style={{ background:'linear-gradient(135deg,#4aff91,#00d1ff)', border:'none', borderRadius:12, padding:'14px 32px', fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:'#003543', cursor:'pointer', fontSize:'1rem' }}>
            Main Lagi
          </button>
          <button onClick={() => router.push('/dashboard')} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'14px 32px', fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, color:'var(--c-on-surface)', cursor:'pointer' }}>
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  const files = ['a','b','c','d','e','f','g','h']
  const ranks = ['8','7','6','5','4','3','2','1']

  return (
    <div style={{ minHeight:'100vh', background:'var(--c-bg)', position:'relative', overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .sq{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:all 0.1s;}
        .sq.selected{box-shadow:inset 0 0 0 3px #4aff91;}
        .sq.legal::after{content:'';position:absolute;width:30%;height:30%;border-radius:50%;background:rgba(74,255,145,0.5);}
        .sq.capture::after{width:100%;height:100%;border-radius:0;background:rgba(74,255,145,0.2);box-shadow:inset 0 0 0 3px rgba(74,255,145,0.6);}
        .timer-box{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 20px;font-family:'Space Grotesk',sans-serif;font-size:1.6rem;font-weight:700;letter-spacing:0.1em;min-width:120px;text-align:center;}
        .timer-box.active{border-color:#4aff91;box-shadow:0 0 12px rgba(74,255,145,0.3);}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:100;}
        .modal{background:#1a2123;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:32px;max-width:360px;width:90%;text-align:center;}
      `}</style>

      {/* Nav */}
      <nav style={{ height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(12px)', background:'rgba(14,20,23,0.8)', position:'sticky', top:0, zIndex:50 }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', background:'linear-gradient(135deg,#4aff91,#00d1ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          ♟️ Chess Arena
        </span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowDrawModal(true)} style={{ background:'rgba(254,177,39,0.15)', border:'1px solid rgba(254,177,39,0.3)', borderRadius:8, padding:'6px 14px', color:'#feb127', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
            🤝 Remis
          </button>
          <button onClick={() => setShowSurrenderModal(true)} style={{ background:'rgba(255,69,69,0.15)', border:'1px solid rgba(255,69,69,0.3)', borderRadius:8, padding:'6px 14px', color:'#ff4545', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
            🏳️ Menyerah
          </button>
        </div>
      </nav>

      {/* Game Area */}
      <main style={{ maxWidth:900, margin:'0 auto', padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:'var(--c-on-surface)' }}>{opponentName}</p>
            <div className={`timer-box${turn!==(playerColor) ? ' active':''}`}>{fmt(playerColor==='w'?timeB:timeW)}</div>
        </div>

        <div style={{ width:'100%', maxWidth:520, display:'grid', gridTemplateColumns:'repeat(8,1fr)', border:'2px solid rgba(255,255,255,0.1)', borderRadius:8, overflow:'hidden' }}>
            {getDisplayBoard(board, playerColor).map((rowArr, displayR) =>
              rowArr.map((piece, displayC) => {
                const r = playerColor === 'w' ? displayR : 7 - displayR;
                const c = playerColor === 'w' ? displayC : 7 - displayC;
                const isLight = (r+c)%2===0
                const isSel = selected?.[0]===r && selected?.[1]===c
                const isLegal = legalMoves.some(([lr,lc])=>lr===r&&lc===c)
                return (
                    <div key={`${r}-${c}`} className={`sq${isSel?' selected':''}${isLegal?' legal':''}`} style={{ background: isSel ? '#4a9b4a' : isLight?'#f0d9b5':'#b58863' }} onClick={() => handleSquareClick(r,c)}>
                      {piece && <PieceIcon type={piece.type} color={piece.color} size={45} />}
                    </div>
                )
              })
            )}
        </div>

        <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:'#00d1ff' }}>{user?.username||'Kamu'}</p>
            <div className={`timer-box${turn===playerColor?' active':''}`}>{fmt(playerColor==='w'?timeW:timeB)}</div>
        </div>
      </main>

      {/* Surrender Modal */}
      {showSurrenderModal && (
        <div className="modal-bg" onClick={() => setShowSurrenderModal(false)}>
          <div className="modal">
            <h2 style={{ color:'var(--c-on-surface)' }}>Menyerah?</h2>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={handleSurrender} style={{ flex:1, padding:12, background:'#ff4545', border:'none', borderRadius:8, cursor:'pointer' }}>Ya</button>
              <button onClick={() => setShowSurrenderModal(false)} style={{ flex:1, padding:12, background:'transparent', border:'1px solid #444', borderRadius:8, cursor:'pointer' }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Offer Confirmation Modal */}
      {showDrawModal && drawOfferedBy && (
        <div className="modal-bg">
          <div className="modal">
            <h2 style={{ color: 'var(--c-primary)', marginBottom: '1rem' }}>Tawaran Remis</h2>
            <p style={{ marginBottom: '2rem' }}>Lawan menawarkan hasil remis (seri). Apakah Anda setuju?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  if (token) {
                    const socket = getSocket(token)
                    socket.emit('chess:accept_draw', { roomId })
                  }
                  setShowDrawModal(false)
                }}
                style={{ padding: '0.75rem 2rem', background:'#4aff91', border:'none', borderRadius:8, cursor:'pointer' }}
              >
                Setuju
              </button>
              <button 
                onClick={() => {
                  setShowDrawModal(false)
                  setDrawOfferedBy(null)
                }}
                style={{ padding: '0.75rem 2rem', background:'transparent', border:'1px solid #444', borderRadius:8, cursor:'pointer' }}
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
