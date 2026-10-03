import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTimer } from '../hooks/useTimer'
import { User, Clock, Plus, Send } from 'lucide-react'
import virtusaLogo from '../assets/virtusa.png'
import { extendSectionTimer } from '../utils/sectionTimer'
import { useTestMode } from '../utils/testMode'
import { toast } from './ToastProvider'

function TimerDisplay({ timerKey }) {
  const { testMode } = useTestMode()
  const { formatted, isWarning, isCritical, fraction } = useTimer(timerKey)

  const barColor = isCritical ? 'var(--error)' : isWarning ? 'var(--warning)' : 'var(--success)'
  const textClass = isCritical ? 'timer critical' : isWarning ? 'timer warning' : 'timer'

  return (
    <div
      title="Remaining Time"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 3,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={12} color={isCritical ? 'var(--error)' : 'var(--text-muted)'} />
        <span className={textClass}>{formatted}</span>
      </div>

      {/* Dynamic progress urgency bar */}
      <div style={{
        width: 90,
        height: 3,
        background: 'var(--border)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${fraction * 100}%`,
          background: barColor,
          borderRadius: 2,
          transition: 'width 1s linear, background 0.5s ease',
        }} />
      </div>
    </div>
  )
}

export default function TopBar({ userId, pageTitle }) {
  const location = useLocation()
  const [codingProblemIdx, setCodingProblemIdx] = useState(0)

  // Listen to active coding problem switches
  useEffect(() => {
    const handler = (e) => {
      if (typeof e.detail?.problemIdx === 'number') {
        setCodingProblemIdx(e.detail.problemIdx)
      }
    }
    window.addEventListener('codeeval_active_problem_changed', handler)
    return () => window.removeEventListener('codeeval_active_problem_changed', handler)
  }, [])

  let timerKey = null
  if (location.pathname === '/exam/mcq') {
    timerKey = 'mcq'            // 40 minutes
  } else if (location.pathname === '/exam/excel') {
    timerKey = 'excel'          // 25 minutes
  } else if (location.pathname === '/exam/sql') {
    timerKey = 'sql'            // 25 minutes
  } else if (location.pathname === '/exam/coding') {
    timerKey = codingProblemIdx === 0 ? 'coding_p1' : 'coding_p2'  // P1: 15 min, P2: 25 min
  }

  return (
    <div className="top-bar">
      <div className="topbar-brand">
        <img
          src={virtusaLogo}
          alt="Virtusa"
          style={{
            height: 44,
            maxWidth: 200,
            width: 'auto',
            objectFit: 'contain',
            verticalAlign: 'middle',
            display: 'block',
          }}
        />
      </div>
      <div className="topbar-title" style={{ flex: 'none', marginRight: 16 }}>{pageTitle || 'Technical Assessment Platform'}</div>

      {location.pathname === '/exam/coding' && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('codeeval_trigger_submit_assessment'))}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #e37d22 0%, #c26111 100%)',
            border: '1px solid #f29e55',
            borderRadius: 6,
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(227, 125, 34, 0.35)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          title="Submit overall assessment with confirmation"
        >
          <Send size={14} />
          Submit Code
        </button>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {userId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '4px 12px 4px 6px',
            borderRadius: 20,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Avatar Icon */}
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 8px rgba(56, 139, 253, 0.4)',
              flexShrink: 0,
            }}>
              <User size={13} strokeWidth={2.5} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{
                fontSize: 8.5,
                fontFamily: 'var(--font-code)',
                color: '#8b949e',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                Candidate
              </span>
              <span style={{
                fontSize: 12,
                fontFamily: 'var(--font-code)',
                color: '#ffffff',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                {userId}
              </span>
            </div>
          </div>
        )}

        {timerKey && (
          <TimerDisplay timerKey={timerKey} />
        )}
      </div>
    </div>
  )
}
