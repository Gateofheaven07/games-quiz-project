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

const PIECE_UNICODE: Record<string, string> = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
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
  const [status, setStatus] = useState<'playing'|'ended'>('playing')
  const [winner, setWinner] = useState<string|null>(null)
  const [endReason, setEndReason] = useState<string>('')
  const [showSurrenderModal, setShowSurrenderModal] = useState(false)
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [drawOfferedBy, setDrawOfferedBy] = useState<string|null>(null)
  const [capturedW, setCapturedW] = useState<string[]>([])
  const [capturedB, setCapturedB] = useState<string[]>([])

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

    const handleOpponentSurrender = (data: { winner: string }) => {
      setStatus('ended')
      setWinner(data.winner)
      setEndReason('Lawan Menyerah')
    }

    const handleDrawOffered = (data: { senderName: string }) => {
      setDrawOfferedBy(data.senderName)
    }

    const handleDrawAccepted = () => {
      setStatus('ended')
      setWinner(null)
      setEndReason('Remis Disetujui')
    }

    socket.on('chess:move', handleOpponentMove)
    socket.on('chess:opponent_surrendered', handleOpponentSurrender)
    socket.on('chess:draw_offered', handleDrawOffered)
    socket.on('chess:draw_accepted', handleDrawAccepted)

    return () => {
      socket.off('chess:move', handleOpponentMove)
      socket.off('chess:opponent_surrendered', handleOpponentSurrender)
      socket.off('chess:draw_offered', handleDrawOffered)
      socket.off('chess:draw_accepted', handleDrawAccepted)
    }
  }, [isAuthenticated, token, roomId, settings.mode])

  // Timer countdown
  useEffect(() => {
    if (status !== 'playing') { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      if (turn === 'w') {
        setTimeW(t => {
          if (t <= 1) { setStatus('ended'); setWinner(opponentName); setEndReason('Waktu Habis'); return 0 }
          return t - 1
        })
      } else {
        setTimeB(t => {
          if (t <= 1) { setStatus('ended'); setWinner(user?.username || 'Kamu'); setEndReason('Waktu Habis'); return 0 }
          return t - 1
        })
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [turn, status])

  // Simple bot move
  useEffect(() => {
    if (turn !== 'b' || status !== 'playing' || settings.mode !== 'bot') return
    const delay = settings.botLevel === 'easy' ? 1500 : settings.botLevel === 'hard' ? 500 : 900
    const t = setTimeout(() => makeBotMove(), delay)
    return () => clearTimeout(t)
  }, [turn, status])

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
      if (newBoard[tr2][tc2]) setCapturedW(p => [...p, PIECE_UNICODE[`w${newBoard[tr2][tc2]!.type}`]])
      newBoard[tr2][tc2] = newBoard[fr][fc]
      newBoard[fr][fc] = null
      return newBoard
    })
    setTurn('w')
  }, [settings.botLevel])

  const handleSquareClick = (row: number, col: number) => {
    if (status !== 'playing' || turn !== playerColor) return
    const piece = board[row][col]
    if (selected) {
      const isLegal = legalMoves.some(([r,c]) => r===row && c===col)
      if (isLegal) {
        const newBoard = board.map(r => [...r])
        let newCapturedW = [...capturedW]
        let newCapturedB = [...capturedB]
        
        if (newBoard[row][col]) {
          const capturedPiece = PIECE_UNICODE[`${newBoard[row][col]!.color}${newBoard[row][col]!.type}`]
          if (turn === 'w') newCapturedB.push(capturedPiece)
          else newCapturedW.push(capturedPiece)
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
    setStatus('ended'); setWinner(opponentName); setEndReason('Menyerah')
    setShowSurrenderModal(false)
    if (settings.mode === 'invite' && token) {
      getSocket(token).emit('chess:surrender', { roomCode: roomId, winner: opponentName })
    }
  }

  const handleOfferDraw = () => {
    if (settings.mode === 'bot') {
      if (settings.botLevel === 'easy') {
        setStatus('ended'); setWinner(null); setEndReason('Remis Disetujui')
      } else {
        setShowDrawModal(false)
        alert('Bot menolak tawaran remis!')
      }
    } else if (token) {
      getSocket(token).emit('chess:offer_draw', { roomCode: roomId, senderName: user?.username || 'Lawan' })
      toast({ title: "Tawaran Terkirim", description: "Menunggu jawaban lawan..." })
    }
    setShowDrawModal(false)
  }

  const handleAcceptDraw = () => {
    setStatus('ended'); setWinner(null); setEndReason('Remis Disetujui')
    setDrawOfferedBy(null)
    if (settings.mode === 'invite' && token) {
      getSocket(token).emit('chess:accept_draw', { roomCode: roomId })
    }
  }

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  if (isLoading || !isAuthenticated) return null

  // ── RESULT SCREEN ──────────────────────────────────────────────────────────
  if (status === 'ended') {
    const isWin = winner === (user?.username || 'Kamu')
    const isDraw = winner === null
    return (
      <div style={{ minHeight:'100vh', background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:24, padding:24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');`}</style>
        <div style={{ fontSize:'5rem' }}>{isDraw ? '🤝' : isWin ? '🏆' : '💀'}</div>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'3rem', fontWeight:700, color: isDraw?'#feb127':isWin?'#4aff91':'#ff4545', textAlign:'center' }}>
          {isDraw ? 'REMIS!' : isWin ? 'KAMU MENANG!' : 'KAMU KALAH!'}
        </h1>
        <p style={{ color:'var(--c-outline)', fontFamily:"'Inter',sans-serif" }}>Alasan: {endReason}</p>
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
        @keyframes spin{to{transform:rotate(360deg)}}
        .sq{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:all 0.1s;}
        .sq:hover{filter:brightness(1.2);}
        .sq.selected{box-shadow:inset 0 0 0 3px #4aff91;}
        .sq.legal::after{content:'';position:absolute;width:30%;height:30%;border-radius:50%;background:rgba(74,255,145,0.5);}
        .sq.legal.capture::after{width:100%;height:100%;border-radius:0;background:rgba(74,255,145,0.2);box-shadow:inset 0 0 0 3px rgba(74,255,145,0.6);}
        .piece{font-size:clamp(1.2rem,4vw,2.2rem);user-select:none;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));}
        .timer-box{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 20px;font-family:'Space Grotesk',sans-serif;font-size:1.6rem;font-weight:700;letter-spacing:0.1em;min-width:120px;text-align:center;}
        .timer-box.active{border-color:#4aff91;box-shadow:0 0 12px rgba(74,255,145,0.3);}
        .timer-box.danger{color:#ff4545;border-color:#ff4545;box-shadow:0 0 12px rgba(255,69,69,0.3);}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:100;}
        .modal{background:#1a2123;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:32px;max-width:360px;width:90%;text-align:center;}
      `}</style>

      <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(74,255,145,0.05) 0%,transparent 70%)', top:-200, left:-200, pointerEvents:'none' }} />

      {/* Nav */}
      <nav style={{ height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(12px)', background:'rgba(14,20,23,0.8)', position:'sticky', top:0, zIndex:50 }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', background:'linear-gradient(135deg,#4aff91,#00d1ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          ♟️ Chess Arena
        </span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowDrawModal(true)} style={{ background:'rgba(254,177,39,0.15)', border:'1px solid rgba(254,177,39,0.3)', borderRadius:8, padding:'6px 14px', color:'#feb127', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
            🤝 Tawaran Remis
          </button>
          <button onClick={() => setShowSurrenderModal(true)} style={{ background:'rgba(255,69,69,0.15)', border:'1px solid rgba(255,69,69,0.3)', borderRadius:8, padding:'6px 14px', color:'#ff4545', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
            🏳️ Menyerah
          </button>
        </div>
      </nav>

      {/* Game Area */}
      <main style={{ maxWidth:900, margin:'0 auto', padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>

        {/* Opponent timer + captured */}
        <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#cf5cff,#feb127)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'#003543', fontSize:'0.9rem' }}>
              {opponentName[0]}
            </div>
            <div>
              <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.9rem', color:'var(--c-on-surface)', margin:0 }}>{opponentName}</p>
              <p style={{ fontSize:'0.7rem', color:'var(--c-outline)', margin:0 }}>{playerColor === 'w' ? 'Hitam' : 'Putih'}</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:'0.75rem', color:'var(--c-outline)' }}>{playerColor === 'w' ? capturedW.join(' ') : capturedB.join(' ')}</div>
            <div className={`timer-box${turn===(playerColor==='w'?'b':'w')?' active':''}${ (playerColor==='w'?timeB:timeW) <30?' danger':''}`}>{fmt(playerColor==='w'?timeB:timeW)}</div>
          </div>
        </div>

        {/* Board */}
        <div style={{ width:'100%', maxWidth:520 }}>
          {/* File labels top */}
          <div style={{ display:'grid', gridTemplateColumns:'20px repeat(8,1fr)', marginBottom:2 }}>
            <div/>
            {files.map(f => <div key={f} style={{ textAlign:'center', fontSize:'0.65rem', color:'var(--c-outline)', fontFamily:"'Space Grotesk',sans-serif", fontWeight:600 }}>{f}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'20px repeat(8,1fr)', gap:0, border:'2px solid rgba(255,255,255,0.1)', borderRadius:8, overflow:'hidden' }}>
            {getDisplayBoard(board, playerColor).map((rowArr, displayR) => {
              // Map display coordinates back to actual board coordinates
              const r = playerColor === 'w' ? displayR : 7 - displayR;
              const rankLabel = playerColor === 'w' ? ranks[displayR] : ranks[7-displayR];

              return [
                <div key={`rank-${r}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'var(--c-outline)', fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, background:'rgba(0,0,0,0.3)' }}>{rankLabel}</div>,
                ...rowArr.map((piece, displayC) => {
                  const c = playerColor === 'w' ? displayC : 7 - displayC;
                  const isLight = (r+c)%2===0
                  const isSel = selected?.[0]===r && selected?.[1]===c
                  const isLegal = legalMoves.some(([lr,lc])=>lr===r&&lc===c)
                  const isCapture = isLegal && !!board[r][c]
                  const bg = isSel ? (isLight?'#7fc97f':'#4a9b4a') : isLight?'#f0d9b5':'#b58863'
                  return (
                    <div key={`${r}-${c}`} className={`sq${isSel?' selected':''}${isLegal?' legal':''}${isCapture?' capture':''}`} style={{ background:bg }} onClick={() => handleSquareClick(r,c)}>
                      {piece && <span className="piece">{PIECE_UNICODE[`${piece.color}${piece.type}`]}</span>}
                    </div>
                  )
                })
              ];
            })}
          </div>
        </div>

        {/* Player timer + captured */}
        <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#00d1ff,#4aff91)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'#003543', fontSize:'0.9rem' }}>
              {(user?.username||'K')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.9rem', color:'#00d1ff', margin:0 }}>{user?.username||'Kamu'} <span style={{ fontSize:'0.7rem', color:'#4aff91' }}>(Kamu)</span></p>
              <p style={{ fontSize:'0.7rem', color:'var(--c-outline)', margin:0 }}>{playerColor === 'w' ? 'Putih' : 'Hitam'}</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:'0.75rem', color:'var(--c-outline)' }}>{playerColor === 'w' ? capturedB.join(' ') : capturedW.join(' ')}</div>
            <div className={`timer-box${turn===playerColor?' active':''}${ (playerColor==='w'?timeW:timeB) <30?' danger':''}`}>{fmt(playerColor==='w'?timeW:timeB)}</div>
          </div>
        </div>

        {/* Turn indicator */}
        <div style={{ background: turn==='w'?'rgba(74,255,145,0.1)':'rgba(207,92,255,0.1)', border:`1px solid ${turn==='w'?'rgba(74,255,145,0.3)':'rgba(207,92,255,0.3)'}`, borderRadius:10, padding:'8px 20px', fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.85rem', color: turn==='w'?'#4aff91':'#cf5cff' }}>
          {turn === playerColor ? '⚡ Giliran Kamu' : '⏳ Giliran Lawan'}
        </div>

        {/* Draw offer received */}
        {drawOfferedBy && drawOfferedBy !== (user?.username||'Kamu') && (
          <div style={{ background:'rgba(254,177,39,0.1)', border:'1px solid rgba(254,177,39,0.3)', borderRadius:12, padding:'16px 24px', textAlign:'center' }}>
            <p style={{ color:'#feb127', fontWeight:600, marginBottom:12 }}>🤝 {drawOfferedBy} menawarkan Remis</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={handleAcceptDraw} style={{ background:'linear-gradient(135deg,#4aff91,#00d1ff)', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:700, color:'#003543', cursor:'pointer' }}>Terima</button>
              <button onClick={() => setDrawOfferedBy(null)} style={{ background:'rgba(255,69,69,0.15)', border:'1px solid rgba(255,69,69,0.3)', borderRadius:8, padding:'8px 20px', fontWeight:600, color:'#ff4545', cursor:'pointer' }}>Tolak</button>
            </div>
          </div>
        )}
      </main>

      {/* Surrender Modal */}
      {showSurrenderModal && (
        <div className="modal-bg" onClick={() => setShowSurrenderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🏳️</div>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", color:'var(--c-on-surface)', marginBottom:8 }}>Menyerah?</h2>
            <p style={{ color:'var(--c-outline)', fontSize:'0.9rem', marginBottom:24 }}>Lawan akan otomatis menang. Apakah kamu yakin?</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleSurrender} style={{ flex:1, background:'rgba(255,69,69,0.2)', border:'1px solid rgba(255,69,69,0.4)', borderRadius:10, padding:'12px', color:'#ff4545', fontWeight:700, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif" }}>Ya, Menyerah</button>
              <button onClick={() => setShowSurrenderModal(false)} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'12px', color:'var(--c-on-surface)', fontWeight:600, cursor:'pointer' }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Modal */}
      {showDrawModal && (
        <div className="modal-bg" onClick={() => setShowDrawModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🤝</div>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", color:'var(--c-on-surface)', marginBottom:8 }}>Tawaran Remis</h2>
            <p style={{ color:'var(--c-outline)', fontSize:'0.9rem', marginBottom:24 }}>
              {settings.mode === 'bot' ? 'Bot akan mempertimbangkan tawaran remis kamu.' : 'Tawaran remis akan dikirim ke lawan.'}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleOfferDraw} style={{ flex:1, background:'rgba(254,177,39,0.2)', border:'1px solid rgba(254,177,39,0.4)', borderRadius:10, padding:'12px', color:'#feb127', fontWeight:700, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif" }}>Ya, Tawarkan</button>
              <button onClick={() => setShowDrawModal(false)} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'12px', color:'var(--c-on-surface)', fontWeight:600, cursor:'pointer' }}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
