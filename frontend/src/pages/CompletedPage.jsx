import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, LogOut } from 'lucide-react'
import { getResult } from '../services/api'
import { markExamCompleted, getLastCompletedUser } from '../utils/authLock'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('attempt')) } catch { return null }
}

export default function CompletedPage() {
  const navigate = useNavigate()
  const session = getSession()
  const attemptId = session?.attemptId

  const [data, setData] = useState(null)
  const isAutoSubmitted = sessionStorage.getItem('codeeval_auto_submitted') === 'true'
  const autoSubmitReason = sessionStorage.getItem('codeeval_auto_submit_reason') || 'Exceeded maximum allowed window switch / exit attempts (3 violations).'

  useEffect(() => {
    // On completed page, never intercept beforeunload
    window.__ALLOW_NAVIGATE__ = true

    if (attemptId) {
      getResult(attemptId)
        .then(res => {
          setData(res)
          if (res?.user_id) {
            markExamCompleted(res.user_id, attemptId)
          }
        })
        .catch(() => {})
    }

    const effectiveUser = session?.userId || getLastCompletedUser() || 'CANDIDATE'
    markExamCompleted(effectiveUser, attemptId)

    // Attempt Full Screen by default on completed page
    if (!document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen().catch(() => {})
      } catch {}
    }

    // Trap back button navigation so candidate cannot revisit questions
    window.history.pushState(null, '', window.location.href)
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [attemptId, session?.userId])

  const storedUser = getLastCompletedUser()
  const userId = data?.user_id ?? session?.userId ?? storedUser ?? 'Candidate'
  const [isExited, setIsExited] = useState(false)

  function handleExit() {
    window.__ALLOW_NAVIGATE__ = true

    // Make sure lockout is permanent in cookies and storage
    if (userId && userId !== 'Candidate') {
      markExamCompleted(userId, attemptId)
    }
    // Clear all attempt and result session storage
    sessionStorage.clear()

    // Immediately hide all buttons and content
    setIsExited(true)

    // 1. Release Full Screen
    if (document.fullscreenElement) {
      try { document.exitFullscreen().catch(() => {}) } catch {}
    }

    // 2. Try closing the window via all browser APIs
    try { window.close() } catch {}
    try { window.open('', '_self', '').close() } catch {}
    try { if (window.top) window.top.close() } catch {}

    // 3. Fallback: navigate immediately to blank so button and page never show again
    setTimeout(() => {
      window.location.replace('about:blank')
    }, 50)
  }

  if (isExited) {
    return <div style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 9999999 }} />
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
    }}>
      <div className="fade-in" style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>

        {/* Icon: Red Alert Triangle if Auto-Submitted, Green Checkmark if Normal */}
        <div style={{
          width: 58, height: 58, borderRadius: '50%',
          background: isAutoSubmitted ? 'rgba(248, 81, 73, 0.12)' : 'rgba(78, 201, 176, 0.12)',
          border: isAutoSubmitted ? '1px solid rgba(248, 81, 73, 0.45)' : '1px solid rgba(78, 201, 176, 0.35)',
          boxShadow: isAutoSubmitted ? '0 0 24px rgba(248, 81, 73, 0.25)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 22px',
        }}>
          {isAutoSubmitted ? (
            <AlertTriangle size={28} color="#f85149" />
          ) : (
            <CheckCircle size={26} color="var(--success, #4ec9b0)" />
          )}
        </div>

        {/* Label */}
        <div style={{
          fontFamily: 'var(--font-code, monospace)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.14em',
          color: isAutoSubmitted ? '#f85149' : 'var(--success, #4ec9b0)',
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          {isAutoSubmitted ? 'Assessment Auto-Submitted' : 'Assessment Complete'}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 22, fontWeight: 600, color: '#ffffff',
          lineHeight: 1.4, marginBottom: 16,
        }}>
          {isAutoSubmitted ? 'Assessment Terminated & Auto-Submitted' : 'Your Technical Round has ended'}
        </div>

        {/* Message */}
        <div style={{
          fontSize: 14, color: '#8b949e', lineHeight: 1.7,
          marginBottom: 32,
        }}>
          {isAutoSubmitted ? (
            <>
              Candidate{' '}
              <span style={{ fontFamily: 'var(--font-code, monospace)', color: '#ffffff', fontWeight: 600 }}>
                {userId}
              </span>
              , your assessment has been automatically submitted.
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                background: 'rgba(248, 81, 73, 0.08)',
                border: '1px solid rgba(248, 81, 73, 0.25)',
                borderRadius: 4,
                color: '#ff7b72',
                fontSize: 12,
                fontFamily: 'var(--font-code, monospace)',
                lineHeight: 1.5,
              }}>
                Reason: {autoSubmitReason}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#8b949e' }}>
                All answers recorded prior to termination have been submitted for evaluation.
              </div>
            </>
          ) : (
            <>
              Thank you for completing the assessment,{' '}
              <span style={{ fontFamily: 'var(--font-code, monospace)', color: '#ffffff', fontWeight: 600 }}>
                {userId}
              </span>.
              <br />
              Your responses have been recorded and saved for review.
            </>
          )}
        </div>

        {/* Close window hint */}
        <div style={{
          fontSize: 12,
          color: '#8b949e',
          fontFamily: 'var(--font-code, monospace)',
          letterSpacing: '0.04em',
          marginBottom: 18,
        }}>
          You may now close this window.
        </div>

        {/* Exit button */}
        <button
          id="exit-window-btn"
          onClick={handleExit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 500,
            color: '#c9d1d9',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.color = '#c9d1d9'
          }}
        >
          <LogOut size={14} />
          Exit Window
        </button>

      </div>
    </div>
  )
}

