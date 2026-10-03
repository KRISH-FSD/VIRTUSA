import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldAlert, Lock, Shield } from 'lucide-react'
import virtusaLogo from '../assets/virtusa.png'
import { isUserCompleted, isExamLocked } from '../utils/authLock'

const ADMIN_CREDENTIALS = ['KRISH', 'KRISH@GMAIL.COM']
const CANDIDATE_CREDENTIALS = [
  'ABINAYABASKAR3110@GMAIL.COM',
  'KRISHSIVAKUMAR@GMAIL.COM',
  'KRISHJERRY@GMAIL.COM',
]

/**
 * StartTest — Lean login page.
 * Strictly permits authorized examiners and registered candidates only.
 */
export default function StartTest() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isExamLocked()) {
      navigate('/exam/completed', { replace: true })
    }
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
    if (!trimmed) { setError('User ID or Email is required'); return }

    // Admin / Examiner login: KRISH or KRISH@GMAIL.COM
    if (ADMIN_CREDENTIALS.includes(trimmed)) {
      setLoading(true)
      sessionStorage.setItem('admin_auth', trimmed)
      navigate('/admin')
      return
    }

    // Candidate login
    if (CANDIDATE_CREDENTIALS.includes(trimmed)) {
      if (isUserCompleted(trimmed)) {
        setError('This assessment has already been submitted. Re-attempts are not allowed.')
        return
      }
      setLoading(true)
      sessionStorage.setItem('preexam_userId', trimmed)
      navigate('/exam/precheck')
      return
    }

    // Unauthorized ID — do NOT reveal who is allowed
    setError('Access denied. Please check your credentials and try again.')
  }

  const isAdminInput = ADMIN_CREDENTIALS.includes(userId.trim().toUpperCase())
  const isCandidateInput = CANDIDATE_CREDENTIALS.includes(userId.trim().toUpperCase())
  const isLocked = Boolean(userId.trim() && isUserCompleted(userId.trim().toUpperCase()))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse at 30% 20%, #0f1623 0%, #0d1117 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-ui)',
    }}>
      {/* Subtle grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(88,166,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="fade-in" style={{
        width: 460, maxWidth: '92vw',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 12,
        padding: '44px 40px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Brand */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <img
            src={virtusaLogo}
            alt="Virtusa"
            style={{
              height: 80, maxWidth: 280, width: 'auto',
              objectFit: 'contain', display: 'block',
              margin: '0 auto 14px',
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))',
            }}
          />
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-code)',
            color: '#8b949e', letterSpacing: '0.1em',
            fontWeight: 500, textTransform: 'uppercase',
          }}>
            Technical Assessment Platform
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #30363d, transparent)', marginBottom: 28 }} />

        {/* Form */}
        <form onSubmit={handleStart}>
          <label style={{
            display: 'block', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.12em', color: '#8b949e',
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
            style={{ marginBottom: 12, fontSize: 14, padding: '12px 16px', borderRadius: 6 }}
          />

          {error && (
            <div style={{
              color: '#f85149', fontSize: 12,
              fontFamily: 'var(--font-code)',
              marginBottom: 14, padding: '10px 12px',
              background: 'rgba(248,81,73,0.08)',
              border: '1px solid rgba(248,81,73,0.25)',
              borderRadius: 6,
              display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5,
            }}>
              <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{error}</div>
            </div>
          )}

          <button
            id="start-assessment-btn"
            type="submit"
            disabled={loading || isLocked}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', fontSize: 13, fontWeight: 700,
              color: '#ffffff',
              background: isLocked
                ? '#21262d'
                : isAdminInput
                  ? 'linear-gradient(135deg, #238636 0%, #196c2e 100%)'
                  : 'linear-gradient(135deg, #1a7fde 0%, #0d5fab 100%)',
              border: isLocked
                ? '1px solid #30363d'
                : isAdminInput
                  ? '1px solid rgba(63,185,80,0.5)'
                  : '1px solid rgba(88,166,255,0.5)',
              borderRadius: 6,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.5 : 1,
              boxShadow: isLocked
                ? 'none'
                : isAdminInput
                  ? '0 4px 16px rgba(35,134,54,0.35)'
                  : '0 4px 16px rgba(26,127,222,0.35)',
              transition: 'all 0.15s ease',
              marginTop: 4,
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ borderTopColor: '#fff' }} /> Processing…</>
            ) : isLocked ? (
              <><Lock size={14} /> Exam Locked</>
            ) : isAdminInput ? (
              <><Shield size={14} /> Enter Examiner Portal <ArrowRight size={14} /></>
            ) : (
              <><Shield size={14} /> Begin Assessment <ArrowRight size={14} /></>
            )}
          </button>
        </form>

        {/* Security notice */}
        <div style={{
          marginTop: 24, padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid #21262d',
          borderRadius: 6,
          fontSize: 11, color: '#8b949e', lineHeight: 1.6,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Lock size={12} color="#8b949e" />
          <span>This assessment is proctored. Your session is monitored for academic integrity.</span>
        </div>
      </div>
    </div>
  )
}
