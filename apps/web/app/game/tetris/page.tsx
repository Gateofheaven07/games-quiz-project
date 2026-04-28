'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'

// ── Tetris constants ────────────────────────────────────────────────────────
const COLS = 10
const ROWS = 20
const TICK_MS = 500

type Color = string
type Board = (Color | null)[][]

// Tetrominoes
const PIECES: { shape: number[][]; color: Color }[] = [
  { shape:[[1,1,1,1]],                           color:'#00d1ff' }, // I — cyan
  { shape:[[1,0],[1,0],[1,1]],                   color:'#feb127' }, // J — gold
  { shape:[[0,1],[0,1],[1,1]],                   color:'#cf5cff' }, // L — purple
  { shape:[[1,1],[1,1]],                         color:'#4aff91' }, // O — green
  { shape:[[0,1,1],[1,1,0]],                     color:'#ff4545' }, // S — red
  { shape:[[1,1,0],[0,1,1]],                     color:'#a4e6ff' }, // Z — light blue
  { shape:[[1,1,1],[0,1,0]],                     color:'#ffb4ab' }, // T — pink
]

function emptyBoard(): Board { return Array.from({length:ROWS},()=>Array(COLS).fill(null)) }

function rotate(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0].length
  return Array.from({length:cols},(_,c)=>Array.from({length:rows},(_,r)=>shape[rows-1-r][c]))
}

function isValid(board:Board, shape:number[][], pos:[number,number]): boolean {
  return shape.every((row,r)=>row.every((v,c)=>{
    if(!v) return true
    const nr=pos[0]+r, nc=pos[1]+c
    return nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!board[nr][nc]
  }))
}

function merge(board:Board, shape:number[][], pos:[number,number], color:Color): Board {
  const next = board.map(r=>[...r])
  shape.forEach((row,r)=>row.forEach((v,c)=>{
    if(v) next[pos[0]+r][pos[1]+c]=color
  }))
  return next
}

function clearLines(board:Board): {board:Board; cleared:number} {
  const filtered = board.filter(row=>row.some(c=>!c))
  const cleared = ROWS - filtered.length
  const newRows: Board = Array.from({length:cleared},()=>Array(COLS).fill(null))
  return { board:[...newRows,...filtered], cleared }
}

function randomPiece() { return PIECES[Math.floor(Math.random()*PIECES.length)] }

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const items = [
    { icon:'dashboard',      label:'Dashboard',    href:'/dashboard' },
    { icon:'swords',         label:'Battle Arena', href:'/game' },
    { icon:'sports_esports', label:'Arcade',       href:'/game/crossword' },
    { icon:'group',          label:'Friends',      href:'/friends' },
    { icon:'leaderboard',    label:'Rankings',     href:'/leaderboard' },
    { icon:'person',         label:'Profile',      href:'/profile' },
  ]
  return (
    <aside style={{ width:200, minWidth:200, backgroundColor:'var(--c-surface-low)', borderRight:'1px solid var(--c-outline-variant)', display:'flex', flexDirection:'column', padding:'16px 12px', gap:4 }}>
      <div style={{ marginBottom:20, paddingInline:8 }}>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.125rem', fontWeight:700, background:'linear-gradient(135deg,#00d1ff,#cf5cff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          ⚡ QuizBattle
        </h1>
      </div>
      {items.map(item=>(
        <Link key={item.href} href={item.href} className={`nav-item${item.label==='Arcade'?' active':''}`} style={{ padding:'0.625rem 0.75rem', fontSize:'0.875rem' }}>
          <span className="material-symbols-rounded" style={{ fontSize:'1.125rem' }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
      <div style={{ flex: 1 }} />
      <button 
        onClick={handleLogout} 
        className="nav-item" 
        style={{ 
          color: '#ffb4ab', 
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          padding:'0.625rem 0.75rem', 
          fontSize:'0.875rem'
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize:'1.125rem' }}>logout</span>
        Log Out
      </button>
    </aside>
  )
}

// ── Mini preview board ───────────────────────────────────────────────────────
function PiecePreview({ piece }: { piece: { shape:number[][];color:Color }|null }) {
  const size = 4
  const grid = Array.from({length:size},()=>Array(size).fill(null))
  if(piece){
    const off = Math.floor((size-piece.shape[0].length)/2)
    piece.shape.forEach((row,r)=>row.forEach((v,c)=>{ if(v) grid[r][c+off]=piece.color }))
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${size},24px)`, gap:2 }}>
      {grid.map((row,r)=>row.map((col,c)=>(
        <div key={`${r}-${c}`} style={{ width:24, height:24, borderRadius:2, backgroundColor:col||'var(--c-surface)', border:`1px solid ${col?'rgba(255,255,255,0.2)':'var(--c-outline-variant)'}`, boxShadow:col?`0 0 8px ${col}60`:undefined }} />
      )))}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function TetrisPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  const [board, setBoard]         = useState<Board>(emptyBoard)
  const [piece, setPiece]         = useState(randomPiece)
  const [nextPiece, setNextPiece] = useState(randomPiece)
  const [pos, setPos]             = useState<[number,number]>([0, Math.floor(COLS/2)-1])
  const [score, setScore]         = useState(42850)
  const [level, setLevel]         = useState(14)
  const [lines, setLines]         = useState(0)
  const [paused, setPaused]       = useState(false)
  const [gameOver, setGameOver]   = useState(false)
  const [held, setHeld]           = useState<typeof PIECES[0]|null>(null)
  const [canHold, setCanHold]     = useState(true)

  const boardRef  = useRef(board)
  const pieceRef  = useRef(piece)
  const posRef    = useRef(pos)
  boardRef.current = board
  pieceRef.current = piece
  posRef.current   = pos

  // Spawn new piece
  const spawn = useCallback((p: typeof PIECES[0], nextP: typeof PIECES[0]) => {
    const startPos: [number,number] = [0, Math.floor(COLS/2)-1]
    if(!isValid(boardRef.current, p.shape, startPos)){
      setGameOver(true)
      return
    }
    setPiece(p)
    setNextPiece(nextP)
    setPos(startPos)
    setCanHold(true)
  }, [])

  // Lock piece into board
  const lock = useCallback(() => {
    const merged = merge(boardRef.current, pieceRef.current.shape, posRef.current, pieceRef.current.color)
    const { board: cleared, cleared: count } = clearLines(merged)
    setBoard(cleared)
    if(count>0){
      const pts = [0,100,300,500,800][count]*(level+1)
      setScore(s=>s+pts)
      setLines(l=>{
        const nl = l+count
        if(Math.floor(nl/10)>Math.floor(l/10)) setLevel(lv=>lv+1)
        return nl
      })
    }
    spawn(nextPiece, randomPiece())
  }, [level, nextPiece, spawn])

  // Move helpers
  const moveDown = useCallback(() => {
    const np: [number,number] = [posRef.current[0]+1, posRef.current[1]]
    if(isValid(boardRef.current, pieceRef.current.shape, np)) setPos(np)
    else lock()
  }, [lock])

  const moveLeft  = useCallback(() => { const np:[number,number]=[posRef.current[0],posRef.current[1]-1]; if(isValid(boardRef.current,pieceRef.current.shape,np)) setPos(np) },[])
  const moveRight = useCallback(() => { const np:[number,number]=[posRef.current[0],posRef.current[1]+1]; if(isValid(boardRef.current,pieceRef.current.shape,np)) setPos(np) },[])
  const rotatePiece = useCallback(() => { const rotated=rotate(pieceRef.current.shape); if(isValid(boardRef.current,rotated,posRef.current)) setPiece(p=>({...p,shape:rotated})) },[])
  const hardDrop = useCallback(() => {
    let p = posRef.current
    while(isValid(boardRef.current, pieceRef.current.shape, [p[0]+1,p[1]])) p=[p[0]+1,p[1]]
    setPos(p)
    setTimeout(()=>lock(),0)
  },[lock])

  const holdPiece = useCallback(() => {
    if(!canHold) return
    const prev = held
    setHeld(pieceRef.current)
    setCanHold(false)
    if(prev) spawn(prev, nextPiece)
    else     spawn(randomPiece(), nextPiece)
  },[canHold, held, nextPiece, spawn])

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if(gameOver) return
      if(e.key==='p'||e.key==='Escape') { setPaused(p=>!p); return }
      if(paused) return
      if(e.key==='ArrowLeft')  { e.preventDefault(); moveLeft() }
      if(e.key==='ArrowRight') { e.preventDefault(); moveRight() }
      if(e.key==='ArrowDown')  { e.preventDefault(); moveDown() }
      if(e.key==='ArrowUp')    { e.preventDefault(); rotatePiece() }
      if(e.key===' ')          { e.preventDefault(); hardDrop() }
      if(e.key==='c'||e.key==='C') holdPiece()
    }
    window.addEventListener('keydown', handler)
    return ()=>window.removeEventListener('keydown', handler)
  },[gameOver, paused, moveLeft, moveRight, moveDown, rotatePiece, hardDrop, holdPiece])

  // Gravity tick
  useEffect(() => {
    if(paused||gameOver) return
    const speed = Math.max(100, TICK_MS - level*30)
    const id = setInterval(moveDown, speed)
    return ()=>clearInterval(id)
  },[paused, gameOver, level, moveDown])

  // Render board with ghost piece
  const ghost = (() => {
    let p = pos
    while(isValid(board, piece.shape, [p[0]+1,p[1]])) p=[p[0]+1,p[1]]
    return p
  })()

  const renderBoard = board.map(r=>[...r])
  piece.shape.forEach((row,r)=>row.forEach((v,c)=>{ if(v){ const nr=ghost[0]+r,nc=ghost[1]+c; if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!renderBoard[nr][nc]) renderBoard[nr][nc]='ghost' } }))
  piece.shape.forEach((row,r)=>row.forEach((v,c)=>{ if(v){ const nr=pos[0]+r,nc=pos[1]+c; if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS) renderBoard[nr][nc]=piece.color } }))

  if (isLoading || !isAuthenticated) return null

  return (
    <div style={{ display:'flex', minHeight:'100vh', backgroundColor:'var(--c-bg)', position:'relative' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');`}</style>
      <div className="bg-orb bg-orb-blue"   style={{ top:-100, right:200 }} />
      <div className="bg-orb bg-orb-purple" style={{ bottom:-100, left:100 }} />
      <Sidebar/>

      <main style={{ flex:1, overflowY:'auto', padding:24, position:'relative', zIndex:1, display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <p className="label-caps" style={{ color:'#feb127', marginBottom:4 }}>ARCADE MODE</p>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.5rem', fontWeight:700, color:'var(--c-on-surface)' }}>Tetris Arena</h2>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <span className="badge badge-primary" style={{ padding:'0.375rem 1rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize:'0.875rem' }}>person</span>
              X_VOID_REAPER_X
            </span>
            <span className="badge" style={{ color:'#4aff91', border:'1px solid #4aff91', background:'rgba(74,255,145,0.08)', padding:'0.375rem 1rem' }}>
              LATENCY: 24MS
            </span>
          </div>
        </div>

        <div style={{ display:'flex', gap:20, flex:1 }}>
          {/* Left panel: hold + stats */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, width:160 }}>
            <div className="glass-panel" style={{ padding:16 }}>
              <p className="label-caps" style={{ color:'var(--c-on-surface-variant)', marginBottom:10 }}>HOLD</p>
              <PiecePreview piece={held}/>
              <p style={{ fontSize:'0.6875rem', color:'var(--c-outline)', marginTop:6 }}>Press C to hold</p>
            </div>
            {[
              { label:'SCORE',  value:score.toLocaleString(),  color:'#00d1ff' },
              { label:'LEVEL',  value:String(level),            color:'#cf5cff' },
              { label:'LINES',  value:String(lines),            color:'#feb127' },
            ].map(stat=>(
              <div key={stat.label} className="glass-panel" style={{ padding:'12px 16px' }}>
                <p className="label-caps" style={{ color:'var(--c-on-surface-variant)', marginBottom:4, fontSize:'0.6rem' }}>{stat.label}</p>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.5rem', color:stat.color, lineHeight:1 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tetris board */}
          <div style={{ position:'relative' }}>
            {(paused||gameOver)&&(
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(14,20,23,0.8)', backdropFilter:'blur(8px)', zIndex:10, borderRadius:'0.75rem', gap:16 }}>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.5rem', fontWeight:700, color:'var(--c-on-surface)' }}>
                  {gameOver?'GAME OVER':'PAUSED'}
                </h3>
                {gameOver?(
                  <button className="btn-primary" onClick={()=>{ setBoard(emptyBoard()); setPiece(randomPiece()); setNextPiece(randomPiece()); setPos([0,Math.floor(COLS/2)-1]); setScore(0); setLevel(1); setLines(0); setGameOver(false); setHeld(null) }}>
                    Play Again
                  </button>
                ):(
                  <button className="btn-ghost" onClick={()=>setPaused(false)}>Resume</button>
                )}
              </div>
            )}
            <div
              className="glass-panel"
              style={{ padding:8, display:'grid', gridTemplateColumns:`repeat(${COLS},28px)`, gridTemplateRows:`repeat(${ROWS},28px)`, gap:2 }}
            >
              {renderBoard.map((row,r)=>row.map((col,c)=>(
                <div
                  key={`${r}-${c}`}
                  style={{
                    width:28, height:28, borderRadius:2,
                    backgroundColor: col==='ghost'?'rgba(255,255,255,0.04)': col||'rgba(255,255,255,0.02)',
                    border: col==='ghost'?'1px dashed rgba(255,255,255,0.1)': col?'1px solid rgba(255,255,255,0.2)':'1px solid rgba(255,255,255,0.03)',
                    boxShadow: col&&col!=='ghost'?`0 0 6px ${col}60`:undefined,
                    transition:'background-color 0.05s ease',
                  }}
                />
              )))}
            </div>

            {/* Keyboard hints */}
            <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
              {[['←→','Move'],['↑','Rotate'],['↓','Soft Drop'],['Space','Hard Drop'],['C','Hold'],['P','Pause']].map(([k,v])=>(
                <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <kbd style={{ padding:'2px 6px', background:'var(--c-surface-highest)', border:'1px solid var(--c-outline-variant)', borderRadius:4, fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.625rem', color:'var(--c-on-surface)' }}>{k}</kbd>
                  <span style={{ fontSize:'0.625rem', color:'var(--c-outline)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: next piece + opponent */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, width:180 }}>
            <div className="glass-panel" style={{ padding:16 }}>
              <p className="label-caps" style={{ color:'var(--c-on-surface-variant)', marginBottom:10 }}>NEXT</p>
              <PiecePreview piece={nextPiece}/>
            </div>

            {/* Arena match */}
            <div className="glass-panel" style={{ padding:16 }}>
              <p className="label-caps" style={{ color:'var(--c-tertiary-container)', marginBottom:10 }}>ARENA MATCH</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[{ name:'OPERATOR_01', score:score, color:'#00d1ff', you:true },
                  { name:'X_VOID_REAPER', score:38420, color:'#cf5cff', you:false }].map(p=>(
                  <div key={p.name} style={{ padding:'8px 10px', borderRadius:'0.5rem', background: p.you?'rgba(0,209,255,0.06)':'rgba(255,255,255,0.03)', border:`1px solid ${p.you?'rgba(0,209,255,0.2)':'rgba(255,255,255,0.06)'}` }}>
                    <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.6875rem', fontWeight:700, color:p.color, marginBottom:4 }}>
                      {p.you?'YOU':p.name}
                    </p>
                    <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', fontWeight:700, color:'var(--c-on-surface)' }}>{p.score.toLocaleString()}</p>
                    <div className="progress-track" style={{ marginTop:4 }}>
                      <div className="progress-fill" style={{ width:`${Math.min(100,(p.score/50000)*100)}%`, background:p.you?undefined:`linear-gradient(90deg,#cf5cff,#feb127)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-ghost" onClick={()=>setPaused(p=>!p)} style={{ justifyContent:'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize:'1.125rem' }}>{paused?'play_arrow':'pause'}</span>
              {paused?'Resume':'Pause'}
            </button>
            <Link href="/dashboard" className="btn-danger" style={{ textDecoration:'none', justifyContent:'center', display:'flex', alignItems:'center', gap:8, padding:'0.75rem 1.5rem', borderRadius:'0.5rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize:'1.125rem' }}>exit_to_app</span>
              Quit
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
