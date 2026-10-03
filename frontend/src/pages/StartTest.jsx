import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldAlert, Lock, Shield, Monitor, BookOpen, Code2, Database, FileSpreadsheet, Users } from 'lucide-react'
import virtusaLogo from '../assets/virtusa.png'
import { isUserCompleted, isExamLocked } from '../utils/authLock'

const ADMIN_CREDENTIALS = ['KRISH', 'KRISH@GMAIL.COM']

// Pattern: KRISH1@GMAIL.COM … KRISH100@GMAIL.COM
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

const EXAM_SECTIONS = [
  { icon: BookOpen,        label: 'MCQ',    time: '40 min', q: '30 Questions', color: '#0A84FF' },
  { icon: FileSpreadsheet, label: 'Excel',  time: '25 min', q: '10 Questions', color: '#30D158' },
  { icon: Database,        label: 'SQL',    time: '25 min', q: '10 Questions', color: '#FF9F0A' },
  { icon: Code2,           label: 'Coding', time: '40 min', q: '2 Problems',   color: '#BF5AF2' },
]

export default function StartTest() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      background: '#0d1117',
      display: 'flex', fontFamily: 'var(--font-ui)',
      overflow: 'hidden',
    }}>
      {/* LEFT PANEL — Branding */}
      <div style={{
        flex: '1 1 0', minWidth: 0,
        background: 'linear-gradient(160deg, #0f1b2d 0%, #0d1117 60%, #111827 100%)',
        borderRight: '1px solid #1e2a3a',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        padding: '60px 64px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(10,132,255,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(48,209,88,0.05) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(88,166,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Logo */}
        <img
          src={virtusaLogo}
          alt="Virtusa"
          style={{ height: 64, objectFit: 'contain', marginBottom: 48, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#0A84FF', textTransform: 'uppercase', marginBottom: 16 }}>
            Talent Acquisition
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: '#ffffff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Technical<br />Assessment<br />Platform
          </div>
          <div style={{ fontSize: 16, color: 'rgba(235,235,245,0.5)', lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
            A secure, proctored evaluation platform to assess programming, analytical, and problem-solving skills.
          </div>

          {/* Section badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {EXAM_SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${s.color}18`, border: `1px solid ${s.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color={s.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{s.label}</span>
                    <span style={{ fontSize: 12, color: 'rgba(235,235,245,0.35)', marginLeft: 8 }}>{s.q}</span>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'rgba(235,235,245,0.35)', fontWeight: 600 }}>{s.time}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 32, left: 64, right: 64, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}>
          <Monitor size={13} color="rgba(235,235,245,0.25)" />
          <span style={{ fontSize: 11, color: 'rgba(235,235,245,0.25)', fontFamily: 'var(--font-code)' }}>
            Proctored · Timed · Secure
          </span>
        </div>
      </div>

      {/* RIGHT PANEL — Login Form */}
      <div style={{
        width: 480, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'stretch',
        padding: '60px 56px',
        background: '#161b22',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Candidate Sign In
          </div>
          <div style={{ fontSize: 14, color: '#8b949e' }}>
            Enter your registered email to begin the assessment.
          </div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, #30363d, transparent)', marginBottom: 32 }} />

        {/* Form */}
        <form onSubmit={handleStart}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', color: '#8b949e',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Login ID / Email Address
          </label>

          <input
            id="user-id-input"
            className="input-field"
            type="text"
            placeholder="Enter your registered email or ID"
            value={userId}
            onChange={handleInputChange}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            style={{
              marginBottom: 12, fontSize: 15,
              padding: '13px 16px', borderRadius: 8,
              letterSpacing: '0.01em',
            }}
          />

          {error && (
            <div style={{
              color: '#f85149', fontSize: 12,
              fontFamily: 'var(--font-code)',
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(248,81,73,0.08)',
              border: '1px solid rgba(248,81,73,0.25)',
              borderRadius: 8,
              display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.6,
            }}>
              <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          <button
            id="start-assessment-btn"
            type="submit"
            disabled={loading || isLocked}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 16px', fontSize: 14, fontWeight: 700,
              color: '#ffffff',
              background: isLocked
                ? '#21262d'
                : isAdminInput
                  ? 'linear-gradient(135deg, #238636 0%, #196c2e 100%)'
                  : 'linear-gradient(135deg, #1a7fde 0%, #0d5fab 100%)',
              border: isLocked ? '1px solid #30363d' : isAdminInput ? '1px solid rgba(63,185,80,0.5)' : '1px solid rgba(88,166,255,0.5)',
              borderRadius: 8,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.5 : 1,
              boxShadow: isLocked ? 'none' : isAdminInput ? '0 4px 20px rgba(35,134,54,0.3)' : '0 4px 20px rgba(26,127,222,0.3)',
              transition: 'all 0.15s ease',
              marginTop: 4,
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ borderTopColor: '#fff', width: 16, height: 16, borderWidth: 2 }} /> Processing…</>
            ) : isLocked ? (
              <><Lock size={14} /> Exam Locked</>
            ) : isAdminInput ? (
              <><Shield size={14} /> Enter Examiner Portal <ArrowRight size={14} /></>
            ) : (
              <><Shield size={14} /> Begin Assessment <ArrowRight size={14} /></>
            )}
          </button>
        </form>

        {/* Stats row */}
        <div style={{
          marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {[
            { label: 'Total Duration', value: '2 hrs 10 min' },
            { label: 'Sections', value: '4 Sections' },
            { label: 'Questions', value: '52 Questions' },
            { label: 'Proctored', value: 'Yes — Live' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid #21262d',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Security notice */}
        <div style={{
          marginTop: 32, padding: '12px 16px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid #21262d',
          borderRadius: 8,
          fontSize: 11, color: '#8b949e', lineHeight: 1.7,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <Lock size={12} color="#8b949e" style={{ marginTop: 2, flexShrink: 0 }} />
          <span>This assessment is proctored. Copy-paste, screenshots, and tab-switching are disabled. Your session is monitored for academic integrity.</span>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#484f58' }}>
          © {new Date().getFullYear()} Virtusa Corporation · Powered by CodeEval
        </div>
      </div>
    </div>
  )
}
