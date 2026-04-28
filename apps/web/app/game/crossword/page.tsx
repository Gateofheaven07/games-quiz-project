'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'

// 10×10 grid solution ('#' = blocked)
const GRID_SOL = [
  ['C','P','U','#','Q','U','I','Z','#','#'],
  ['O','#','#','#','#','I','#','#','#','#'],
  ['D','A','T','A','#','Z','#','#','#','#'],
  ['E','#','#','#','#','#','#','#','#','#'],
  ['#','#','#','#','N','E','T','#','#','#'],
  ['#','G','P','U','#','#','#','#','#','#'],
  ['#','A','#','#','#','#','#','#','#','#'],
  ['#','M','E','M','O','R','Y','#','#','#'],
  ['#','E','#','#','#','#','#','#','#','#'],
  ['#','#','#','#','#','#','#','#','#','#'],
]
const SIZE = 10

const CLUE_NUMS: Record<string,number> = {
  '0-0':1,'0-4':2,'2-0':3,'4-4':4,'5-1':5,'7-1':6
}

const CLUES = {
  across: [
    { n:1, text:'Central processing unit of a competitive machine.' },
    { n:2, text:'A rapid series of electronic questions.' },
    { n:3, text:'A collection of related data points.' },
    { n:4, text:'The digital infrastructure of the world.' },
    { n:5, text:'Hardware component for high-fidelity graphics.' },
    { n:6, text:'A temporary storage unit for active memory.' },
  ],
  down: [
    { n:1, text:'To write intricate instructions for a computer.' },
    { n:2, text:'Measurement of tactical speed.' },
    { n:5, text:'Visual representation of an operator\'s identity.' },
  ],
}

type Dir = 'across'|'down'

function buildGrid() {
  return GRID_SOL.map((row, r) =>
    row.map((ch, c) => ({
      blocked: ch === '#',
      letter: '',
      value: ch === '#' ? '' : ch,
      correct: false,
      num: CLUE_NUMS[`${r}-${c}`],
    }))
  )
}

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

export default function CrosswordPage() {
  const [grid, setGrid] = useState(buildGrid)
  const [active, setActive] = useState<[number,number]|null>(null)
  const [dir, setDir] = useState<Dir>('across')
  const [timeLeft, setTimeLeft] = useState(4*60+12)
  const [score, setScore] = useState(1450)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const id = setInterval(()=>setTimeLeft(t=>Math.max(0,t-1)),1000)
    return ()=>clearInterval(id)
  },[])

  const fmt = (s:number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  const activeWord = useCallback((): Set<string> => {
    const s = new Set<string>()
    if(!active) return s
    const [ar,ac] = active
    if(dir==='across'){
      let col=ac; while(col>0&&!grid[ar][col-1].blocked) col--
      while(col<SIZE&&grid[ar][col]&&!grid[ar][col].blocked){ s.add(`${ar}-${col}`); col++ }
    } else {
      let row=ar; while(row>0&&!grid[row-1][ac].blocked) row--
      while(row<SIZE&&grid[row]&&!grid[row][ac].blocked){ s.add(`${row}-${ac}`); row++ }
    }
    return s
  },[active,dir,grid])

  const wordCells = activeWord()

  const handleCellClick = (r:number,c:number) => {
    if(grid[r][c].blocked) return
    if(active&&active[0]===r&&active[1]===c) setDir(d=>d==='across'?'down':'across')
    else setActive([r,c])
    inputRef.current?.focus()
  }

  const handleKey = (e:React.KeyboardEvent<HTMLInputElement>) => {
    if(!active) return
    const [r,c] = active
    if(e.key.match(/^[a-zA-Z]$/)&&e.key.length===1){
      const ch = e.key.toUpperCase()
      setGrid(prev=>{
        const next=prev.map(row=>row.map(cell=>({...cell})))
        next[r][c].letter=ch
        if(ch===next[r][c].value){ next[r][c].correct=true; setScore(s=>s+50) }
        return next
      })
      if(dir==='across'&&c+1<SIZE&&!grid[r][c+1].blocked) setActive([r,c+1])
      else if(dir==='down'&&r+1<SIZE&&!grid[r+1][c].blocked) setActive([r+1,c])
    } else if(e.key==='Backspace'){
      setGrid(prev=>{
        const next=prev.map(row=>row.map(cell=>({...cell})))
        if(next[r][c].letter){ next[r][c].letter=''; next[r][c].correct=false }
        else if(dir==='across'&&c-1>=0&&!next[r][c-1].blocked){ setActive([r,c-1]); next[r][c-1].letter='' }
        else if(dir==='down'&&r-1>=0&&!next[r-1][c].blocked){ setActive([r-1,c]); next[r-1][c].letter='' }
        return next
      })
    } else if(e.key==='ArrowRight'){ setDir('across'); if(c+1<SIZE&&!grid[r][c+1].blocked) setActive([r,c+1]) }
    else if(e.key==='ArrowLeft'){  setDir('across'); if(c-1>=0&&!grid[r][c-1].blocked) setActive([r,c-1]) }
    else if(e.key==='ArrowDown'){  setDir('down');   if(r+1<SIZE&&!grid[r+1][c].blocked) setActive([r+1,c]) }
    else if(e.key==='ArrowUp'){    setDir('down');   if(r-1>=0&&!grid[r-1][c].blocked) setActive([r-1,c]) }
    e.preventDefault()
  }

  if (isLoading || !isAuthenticated) return null

  return (
    <div style={{ display:'flex', minHeight:'100vh', backgroundColor:'var(--c-bg)', position:'relative' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');`}</style>
      <div className="bg-orb bg-orb-purple" style={{ top:-100, left:100 }} />
      <div className="bg-orb bg-orb-blue"   style={{ bottom:-100, right:0 }} />
      <Sidebar/>
      <main style={{ flex:1, overflowY:'auto', padding:24, position:'relative', zIndex:1 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <p className="label-caps" style={{ color:'var(--c-secondary-container)', marginBottom:4 }}>ARCADE MODE</p>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.5rem', fontWeight:700, color:'var(--c-on-surface)' }}>Daily Decryptor</h2>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            {[{icon:'timer',label:'TIME',val:fmt(timeLeft),col:timeLeft<60?'#ff4545':'var(--c-on-surface)',accent:'#feb127'},
              {icon:'star', label:'SCORE',val:score.toLocaleString(),col:'var(--c-on-surface)',accent:'#00d1ff'}].map(s=>(
              <div key={s.label} className="glass-panel" style={{ padding:'10px 20px', display:'flex', alignItems:'center', gap:10 }}>
                <span className="material-symbols-rounded" style={{ color:s.accent, fontSize:'1.25rem' }}>{s.icon}</span>
                <div>
                  <p className="label-caps" style={{ color:'var(--c-outline)', fontSize:'0.5rem' }}>{s.label}</p>
                  <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.125rem', color:s.col }}>{s.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
          {/* Grid */}
          <div>
            <input ref={inputRef} onKeyDown={handleKey} style={{ position:'absolute', opacity:0, pointerEvents:'none', width:1, height:1 }} readOnly />
            <div className="glass-panel" style={{ padding:16, display:'inline-block' }} onClick={()=>inputRef.current?.focus()}>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${SIZE},40px)`, gap:2 }}>
                {grid.map((row,r)=>row.map((cell,c)=>{
                  const isAct = active?.[0]===r&&active?.[1]===c
                  const inW   = wordCells.has(`${r}-${c}`)
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        width:40, height:40, borderRadius:2,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        position:'relative', cursor:cell.blocked?'default':'pointer',
                        fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1rem',
                        userSelect:'none',
                        backgroundColor: cell.blocked?'rgba(9,15,18,0.8)': isAct?'rgba(0,209,255,0.2)': cell.correct?'rgba(74,255,145,0.1)': inW?'rgba(0,209,255,0.06)':'var(--c-surface)',
                        border: cell.blocked?'1px solid var(--c-surface-low)': isAct?'2px solid #00d1ff': cell.correct?'1px solid #4aff91': inW?'1px solid rgba(0,209,255,0.3)':'1px solid var(--c-outline-variant)',
                        color: cell.correct?'#4aff91': isAct?'#00d1ff':'var(--c-on-surface)',
                      }}
                      onClick={()=>handleCellClick(r,c)}
                    >
                      {cell.num&&!cell.blocked&&<span style={{ position:'absolute', top:2, left:3, fontSize:'0.5rem', color:'var(--c-on-surface-variant)', fontWeight:700 }}>{cell.num}</span>}
                      {!cell.blocked&&cell.letter}
                    </div>
                  )
                }))}
              </div>
            </div>
            <div style={{ marginTop:10, display:'flex', gap:8 }}>
              {(['across','down'] as Dir[]).map(d=>(
                <button key={d} className={dir===d?'btn-primary':'btn-ghost'} style={{ padding:'0.5rem 1rem', fontSize:'0.75rem' }} onClick={()=>setDir(d)}>
                  <span className="material-symbols-rounded" style={{ fontSize:'1rem' }}>{d==='across'?'align_horizontal_left':'align_vertical_bottom'}</span>
                  {d.charAt(0).toUpperCase()+d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Clues */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>
            {(['across','down'] as Dir[]).map(d=>(
              <div key={d} className="glass-panel" style={{ padding:20, maxHeight:280, overflowY:'auto' }}>
                <h4 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.875rem', color:d==='across'?'var(--c-primary-container)':'var(--c-secondary-container)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <span className="material-symbols-rounded" style={{ fontSize:'1rem' }}>{d==='across'?'align_horizontal_left':'align_vertical_bottom'}</span>
                  {d.charAt(0).toUpperCase()+d.slice(1)}
                </h4>
                {CLUES[d].map(clue=>(
                  <div key={clue.n} style={{ padding:'8px 12px', borderRadius:'0.5rem', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', marginBottom:6, cursor:'pointer' }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.6875rem', color:d==='across'?'var(--c-primary-container)':'var(--c-secondary-container)', marginRight:8 }}>{clue.n}</span>
                    <span style={{ fontSize:'0.8125rem', color:'var(--c-on-surface-variant)' }}>{clue.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
