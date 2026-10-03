import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldAlert, Lock, Shield } from 'lucide-react'
import virtusaLogo from '../assets/virtusa.png'
import { isUserCompleted, isExamLocked } from '../utils/authLock'

const ADMIN_CREDENTIALS = ['KRISH', 'KRISH@GMAIL.COM']

function isPatternCandidate(trimmed) {
  const m = trimmed.match(/^KRISH(\d+)@GMAIL\.COM$/)
  if (!m) return false
  const n = parseInt(m[1], 10)
  return n >= 1 && n <= 100
}

const FIXED_CANDIDATES = [
  'ABINAYABASKAR3110@GMAIL.COM',
  'KRISHSIVAKUMAR@GMAIL.COM',
  'KRISHJERRY@GMAIL.COM',
]

function isAuthorizedCandidate(trimmed) {
  return FIXED_CANDIDATES.includes(trimmed) || isPatternCandidate(trimmed)
}

// ── Animated code rain canvas ─────────────────────────────────────────────────
const CODE_SNIPPETS = [
  'function assess()', 'const result =', 'return score;', 'SELECT *', 'WHERE id =',
  'def evaluate():', 'import sys', 'class Exam:', 'for i in range', 'if __name__',
  '01101001', '10110100', 'npm run', 'git commit', 'pip install',
  'O(n log n)', 'O(1)', 'hashMap.get', 'async/await', 'try { }',
  'catch(err)', '.then(res)', 'console.log', 'print(out)', 'fprintf',
  '// TODO', '/* SECURE */', '#!/usr/bin', 'export default', 'useState',
  'useEffect', 'className=', 'borderRadius', 'flexDirection', 'backgroundColor',
  'JOIN ON', 'GROUP BY', 'ORDER BY', 'INNER JOIN', 'CREATE TABLE',
  'vlookup()', 'INDEX(MATCH)', 'SUMIF()', '=A1+B1', 'pivot_table',
]

function CodeRainCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight

    const NEON_COLORS = [
      'rgba(0,255,136,',
      'rgba(0,200,255,',
      'rgba(120,80,255,',
      'rgba(255,60,180,',
      'rgba(255,200,0,',
    ]

    const particles = Array.from({ length: 55 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      text: CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)],
      speed: 0.18 + Math.random() * 0.38,
      opacity: 0.045 + Math.random() * 0.12,
      size: 10 + Math.floor(Math.random() * 6),
      colorIdx: Math.floor(Math.random() * NEON_COLORS.length),
      drift: (Math.random() - 0.5) * 0.12,
    }))

    let animId
    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        ctx.font = `${p.size}px 'JetBrains Mono', 'Fira Code', monospace`
        ctx.fillStyle = NEON_COLORS[p.colorIdx] + p.opacity + ')'
        ctx.fillText(p.text, p.x, p.y)
        p.y -= p.speed
        p.x += p.drift
        if (p.y < -30) {
          p.y = H + 30
          p.x = Math.random() * W
          p.text = CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)]
        }
        if (p.x < -200) p.x = W + 10
        if (p.x > W + 200) p.x = -10
      }
      animId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}

export default function StartTest() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (isExamLocked()) navigate('/exam/completed', { replace: true })
  }, [navigate])

  if (isExamLocked()) return null

  function handleInputChange(e) {
    const val = e.target.value.toUpperCase()
    setUserId(val)
    const trimmed = val.trim()
    if (trimmed && isUserCompleted(trimmed)) {
      setError('This assessment has already been submitted. Re-attempts are not allowed.')
    } else {
      setError('')
    }
  }

  function handleStart(e) {
    e.preventDefault()
    const trimmed = userId.trim().toUpperCase()
    if (!trimmed) { setError('Please enter your registered email address.'); return }

    if (ADMIN_CREDENTIALS.includes(trimmed)) {
      setLoading(true)
      sessionStorage.setItem('admin_auth', trimmed)
      navigate('/admin')
      return
    }

    if (isAuthorizedCandidate(trimmed)) {
      if (isUserCompleted(trimmed)) {
        setError('This assessment has already been submitted. Re-attempts are not allowed.')
        return
      }
      setLoading(true)
      sessionStorage.setItem('preexam_userId', trimmed)
      navigate('/exam/precheck')
      return
    }

    setError('Access denied. Please check your credentials and try again.')
  }

  const isAdminInput = ADMIN_CREDENTIALS.includes(userId.trim().toUpperCase())
  const isLocked = Boolean(userId.trim() && isUserCompleted(userId.trim().toUpperCase()))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse at 50% 40%, #080f1a 0%, #030508 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-ui)',
      overflow: 'hidden',
    }}>

      {/* Animated code rain */}
      <CodeRainCanvas />

      {/* Radial glow behind card */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,180,255,0.07) 0%, transparent 70%)',
      }} />

      {/* Main Card */}
      <div
        className="fade-in"
        style={{
          position: 'relative', zIndex: 2,
          width: '100%', maxWidth: 440,
          margin: '0 auto',
          background: 'rgba(10, 14, 22, 0.82)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: '52px 48px 44px',
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(48px)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.75), 0 0 80px rgba(0,180,255,0.06)',
        }}
      >
        {/* Top neon line */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.5), rgba(120,80,255,0.5), transparent)',
          borderRadius: 1,
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src={virtusaLogo}
            alt="Virtusa"
            style={{
              height: 72, maxWidth: 240, width: 'auto',
              objectFit: 'contain', display: 'block',
              margin: '0 auto 14px',
              filter: 'drop-shadow(0 0 20px rgba(0,180,255,0.35))',
            }}
          />
          <div style={{
            fontSize: 10, letterSpacing: '0.22em', fontWeight: 700,
            color: 'rgba(0,200,255,0.65)', textTransform: 'uppercase',
            fontFamily: 'var(--font-code)',
          }}>
            Technical Assessment Platform
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          marginBottom: 32,
        }} />

        {/* Form */}
        <form onSubmit={handleStart}>
          <label style={{
            display: 'block', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.15em', color: 'rgba(235,235,245,0.4)',
            textTransform: 'uppercase', marginBottom: 10,
            fontFamily: 'var(--font-code)',
          }}>
            Email Address
          </label>

          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              id="user-id-input"
              type="text"
              placeholder="yourname@example.com"
              value={userId}
              onChange={handleInputChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontSize: 15, padding: '14px 18px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${focused ? 'rgba(0,200,255,0.45)' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: 12,
                color: '#e6edf3',
                fontFamily: 'var(--font-code)',
                letterSpacing: '0.02em',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: focused ? '0 0 0 3px rgba(0,200,255,0.10), inset 0 1px 2px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.3)',
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#ff6b6b', fontSize: 12,
              fontFamily: 'var(--font-code)',
              marginBottom: 14, padding: '10px 14px',
              background: 'rgba(255,69,58,0.08)',
              border: '1px solid rgba(255,69,58,0.22)',
              borderRadius: 10,
              display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.6,
            }}>
              <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          <button
            id="start-assessment-btn"
            type="submit"
            disabled={loading || isLocked}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 18px', fontSize: 14, fontWeight: 700,
              color: '#fff',
              background: isLocked
                ? 'rgba(255,255,255,0.06)'
                : isAdminInput
                  ? 'linear-gradient(135deg, #238636, #196c2e)'
                  : 'linear-gradient(135deg, #0A84FF 0%, #005FCC 100%)',
              border: 'none', borderRadius: 12,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: (loading || isLocked) ? 0.55 : 1,
              boxShadow: isLocked ? 'none' : isAdminInput
                ? '0 4px 24px rgba(35,134,54,0.35)'
                : '0 4px 24px rgba(10,132,255,0.4), 0 0 40px rgba(10,132,255,0.12)',
              transition: 'all 0.18s ease',
              letterSpacing: '0.01em',
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ borderTopColor: '#fff', width: 16, height: 16, borderWidth: 2 }} /> Verifying…</>
            ) : isLocked ? (
              <><Lock size={15} /> Exam Locked</>
            ) : isAdminInput ? (
              <><Shield size={15} /> Enter Examiner Portal <ArrowRight size={15} /></>
            ) : (
              <><Shield size={15} /> Begin Assessment <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 11, color: 'rgba(235,235,245,0.2)', fontFamily: 'var(--font-code)',
        }}>
          <Lock size={11} />
          <span>Proctored · Monitored · Secure</span>
        </div>

        {/* Bottom neon line */}
        <div style={{
          position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.3), transparent)',
          borderRadius: 1,
        }} />
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        #user-id-input::placeholder {
          color: rgba(235,235,245,0.2);
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  )
}
