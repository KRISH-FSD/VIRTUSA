import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Maximize2, RefreshCw, Zap, ChevronRight,
  Clock, Shield, BookOpen, Code2, Database,
  FileSpreadsheet, Lock, Eye, Check, X,
  ShieldCheck, CheckCircle, XCircle,
} from 'lucide-react'
import virtusaLogo from '../assets/virtusa.png'
import { checkSystemEnvironment, closeDisallowedApps, startExam } from '../services/api'
import { markExamCompleted, isExamLocked } from '../utils/authLock'
import { clearAllSectionTimers } from '../utils/sectionTimer'

// ── Stage constants ───────────────────────────────────────────────────────────
const STAGE_ENV   = 'environment'
const STAGE_GUIDE = 'guidelines'
const GUIDE_READ_SECONDS = 300

// ── iOS 28 design tokens ──────────────────────────────────────────────────────
const C = {
  bg:      '#000000',
  surf:    'rgba(28, 28, 30, 0.92)',
  surf2:   'rgba(44, 44, 46, 0.85)',
  fill:    'rgba(255, 255, 255, 0.08)',
  fill2:   'rgba(255, 255, 255, 0.05)',
  border:  'rgba(255, 255, 255, 0.1)',
  sep:     'rgba(84, 84, 88, 0.55)',
  blue:    '#0A84FF',
  green:   '#30D158',
  orange:  '#FF9F0A',
  red:     '#FF453A',
  purple:  '#BF5AF2',
  t1:      '#FFFFFF',
  t2:      'rgba(235, 235, 245, 0.6)',
  t3:      'rgba(235, 235, 245, 0.3)',
}

// ── Exam sections (compact) ───────────────────────────────────────────────────
const SECTIONS = [
  { icon: BookOpen,        label: 'MCQ',    time: '40 min', q: '30 questions', color: C.blue   },
  { icon: FileSpreadsheet, label: 'Excel',  time: '25 min', q: '10 questions', color: C.green  },
  { icon: Database,        label: 'SQL',    time: '25 min', q: '10 questions', color: C.orange },
  { icon: Code2,           label: 'Coding', time: '40 min', q: '2 problems',   color: C.purple },
]

// ── Camera state machine ──────────────────────────────────────────────────────
const CAM = {
  IDLE:       'idle',
  REQUESTING: 'requesting',
  LIVE:       'live',
  REVIEW:     'review',
  UPLOADING:  'uploading',
  DONE:       'done',
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = 'primary', style: x = {} }) {
  const s = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '16px 20px',
    fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em',
    borderRadius: 14, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s ease',
    fontFamily: 'var(--font-ui)',
    opacity: disabled ? 0.32 : 1,
    ...x,
  }
  const v = {
    primary:   { background: C.blue,  color: '#fff' },
    ghost:     { background: C.fill,  color: C.t1, border: `1px solid ${C.border}` },
    danger:    { background: 'rgba(255,69,58,0.12)', color: C.red, border: `1px solid rgba(255,69,58,0.25)` },
  }
  return <button onClick={disabled ? undefined : onClick} style={{ ...s, ...v[variant] }}>{children}</button>
}

function Card({ children, style: x = {} }) {
  return (
    <div style={{
      background: C.surf2,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      overflow: 'hidden',
      ...x,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: C.t3, marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function Dots({ current }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 36 }}>
      {[0, 1].map(i => (
        <div key={i} style={{
          width: i === current ? 22 : 6, height: 6, borderRadius: 3,
          background: i === current ? C.blue : i < current ? C.green : C.fill,
          transition: 'all 0.35s ease',
        }} />
      ))}
    </div>
  )
}

function StageHeader({ step, title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.blue, marginBottom: 10 }}>
        {step}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: C.t1, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 15, color: C.t2 }}>{sub}</div>}
    </div>
  )
}

/* ============================================================================
 * STAGE 1 (DISABLED / COMMENTED OUT): College ID Photo Verification
 * Camera and microphone permissions are completely disabled.
 * ============================================================================
function StageIDPhoto({ userId, onNext }) {
  // Camera & ID photo capture logic is safely disabled
}
============================================================================ */

// ── STAGE 1: Environment Check ────────────────────────────────────────────────
function StageEnvironment({ userId, testMode, onNext }) {
  const [apps, setApps]               = useState([])
  const [checking, setChecking]       = useState(false)
  const [closing, setClosing]         = useState(false)
  const [fullscreen, setFullscreen]   = useState(Boolean(document.fullscreenElement))
  const [envClean, setEnvClean]       = useState(false)

  useEffect(() => {
    const h = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const checkApps = useCallback(async () => {
    if (testMode) { setApps([]); setEnvClean(true); return }
    setChecking(true)
    try {
      const r = await checkSystemEnvironment()
      setApps(r.disallowed_apps || [])
      setEnvClean(r.clean)
    } catch { setEnvClean(true) }
    finally { setChecking(false) }
  }, [testMode])

  useEffect(() => { checkApps() }, [checkApps])

  const handleClose = async () => {
    setClosing(true)
    try {
      const r = await closeDisallowedApps()
      setApps(r.remaining || [])
      setEnvClean(r.success)
    } catch { await checkApps() }
    finally { setClosing(false) }
  }

  const handleFS = async () => {
    try { await document.documentElement.requestFullscreen() } catch {}
  }

  const canProceed = (testMode || envClean) && fullscreen

  const rows = [
    {
      icon: apps.length > 0 ? XCircle : CheckCircle,
      iconColor: apps.length > 0 ? C.red : C.green,
      label: 'Background Apps',
      sub: apps.length > 0 ? apps.join(', ') : 'All clear',
      ok: testMode || envClean,
      action: !testMode && apps.length > 0
        ? <button
            onClick={handleClose} disabled={closing}
            style={{ ...chipBtn, color: C.red, borderColor: 'rgba(255,69,58,0.3)', background: 'rgba(255,69,58,0.1)' }}>
            <Zap size={12} /> {closing ? 'Closing…' : 'Close All'}
          </button>
        : null,
    },
    {
      icon: fullscreen ? CheckCircle : XCircle,
      iconColor: fullscreen ? C.green : C.orange,
      label: 'Full Screen',
      sub: fullscreen ? 'Active' : 'Required before continuing',
      ok: fullscreen,
      action: !fullscreen
        ? <button
            onClick={handleFS}
            style={{ ...chipBtn, color: C.blue, borderColor: 'rgba(10,132,255,0.3)', background: 'rgba(10,132,255,0.1)' }}>
            <Maximize2 size={12} /> Enter F11
          </button>
        : null,
    },
  ]

  return (
    <div style={overlay}>
      <div style={wrap}>

        <StageHeader
          step="Step 1 of 2"
          title="System Readiness"
          sub="Close background apps and enable full screen"
        />

        <Card style={{ marginBottom: 16 }}>
          {rows.map((row, i) => {
            const Icon = row.icon
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px',
                borderBottom: i === 0 ? `1px solid ${C.sep}` : 'none',
              }}>
                <Icon size={22} color={row.iconColor} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.t1 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: C.t3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.sub}</div>
                </div>
                {row.action}
              </div>
            )
          })}
        </Card>

        <div style={{ marginBottom: 12 }}>
          <Btn onClick={checkApps} variant="ghost" disabled={checking}>
            <RefreshCw size={16} className={checking ? 'spin' : ''} />
            {checking ? 'Checking…' : 'Re-check'}
          </Btn>
        </div>

        <Btn onClick={onNext} disabled={!canProceed}>
          Continue <ChevronRight size={18} />
        </Btn>

        <Dots current={0} />
      </div>
    </div>
  )
}

// ── STAGE 3: Guidelines ───────────────────────────────────────────────────────
function StageGuidelines({ userId, testMode, onStartExam, loading }) {
  const readDuration = testMode ? 3 : GUIDE_READ_SECONDS
  const [secsLeft, setSecsLeft] = useState(readDuration)
  const [canStart, setCanStart] = useState(false)

  useEffect(() => {
    if (secsLeft <= 0) { setCanStart(true); return }
    const t = setInterval(() => setSecsLeft(s => {
      if (s <= 1) { setCanStart(true); clearInterval(t); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [])

  const mm  = String(Math.floor(secsLeft / 60)).padStart(2, '0')
  const ss  = String(secsLeft % 60).padStart(2, '0')
  const pct = ((readDuration - secsLeft) / readDuration) * 100
  const urgent = secsLeft <= 60 && secsLeft > 0
  const timerColor = canStart ? C.green : urgent ? C.orange : C.blue

  return (
    <div style={{ ...overlay, alignItems: 'flex-start', overflowY: 'auto', paddingTop: 36, paddingBottom: 52 }}>
      <div style={{ ...wrap, maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={virtusaLogo} alt="Virtusa"
            style={{ height: 54, objectFit: 'contain', marginBottom: 18, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
          />
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.blue, marginBottom: 10 }}>Step 2 of 2</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.t1, letterSpacing: '-0.03em', marginBottom: 4 }}>Exam Guidelines</div>
          <div style={{ fontSize: 15, color: C.t2 }}>{userId}</div>
        </div>

        {/* ── Timer ── */}
        <Card style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color={timerColor} />
              <span style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>
                {canStart ? 'Ready to begin' : 'Mandatory read time'}
              </span>
            </div>
            <span style={{
              fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-code)',
              color: timerColor, letterSpacing: '-0.02em',
            }}>
              {canStart ? '00:00' : `${mm}:${ss}`}
            </span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, width: `${pct}%`,
              background: timerColor, transition: 'width 1s linear, background 0.3s ease',
            }} />
          </div>
          {!canStart && (
            <div style={{ fontSize: 12, color: C.t3, marginTop: 8, textAlign: 'right' }}>
              Start button unlocks at 00:00
            </div>
          )}
        </Card>

        {/* ── Sections ── */}
        <SectionLabel>Sections</SectionLabel>
        <Card style={{ marginBottom: 20 }}>
          {SECTIONS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderBottom: i < SECTIONS.length - 1 ? `1px solid ${C.sep}` : 'none',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={s.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.t1 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: C.t3, marginTop: 1 }}>{s.q}</div>
                </div>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-code)', color: C.t2, fontWeight: 500 }}>{s.time}</div>
              </div>
            )
          })}
        </Card>

        {/* ── Rules ── */}
        <SectionLabel>Rules</SectionLabel>
        <Card style={{ marginBottom: 20 }}>
          {[
            { icon: Maximize2,   text: 'Full screen required — 5 exits triggers auto-submit' },
            { icon: Eye,         text: '3 window switches → exam auto-submitted' },
            { icon: Lock,        text: 'Copy, paste & screenshots disabled' },
            { icon: ShieldCheck, text: 'Automated background proctoring active' },
            { icon: Shield,      text: 'F5, F12 and right-click are blocked' },
          ].map((r, i, arr) => {
            const Icon = r.icon
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.sep}` : 'none',
              }}>
                <Icon size={16} color={C.t3} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: C.t1 }}>{r.text}</span>
              </div>
            )
          })}
        </Card>

        {/* ── Navigation ── */}
        <SectionLabel>Navigation</SectionLabel>
        <Card style={{ marginBottom: 28 }}>
          {[
            { icon: Check, color: C.green, text: 'Navigate freely within MCQ, Excel & SQL' },
            { icon: Check, color: C.green, text: 'Answers auto-save as you go' },
            { icon: X,     color: C.red,   text: 'Cannot return to a submitted section' },
            { icon: X,     color: C.red,   text: 'Sections advance automatically — no skipping' },
            { icon: X,     color: C.red,   text: 'Coding: strict per-problem timers (15 + 25 min)' },
          ].map((n, i, arr) => {
            const Icon = n.icon
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.sep}` : 'none',
              }}>
                <Icon size={14} color={n.color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: C.t1 }}>{n.text}</span>
              </div>
            )
          })}
        </Card>

        {/* ── Start button ── */}
        <Btn onClick={onStartExam} disabled={!canStart || loading}>
          {loading
            ? <><div className="spinner" style={{ borderTopColor: '#fff', width: 18, height: 18, borderWidth: 2 }} /> Starting…</>
            : canStart
              ? <><Shield size={18} /> Start Examination</>
              : <><Clock size={16} /> Unlocks in {mm}:{ss}</>
          }
        </Btn>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: C.t3 }}>
          By proceeding you agree to all examination rules
        </div>

        <Dots current={1} />
      </div>
    </div>
  )
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
export default function PreExamFlow() {
  const navigate     = useNavigate()
  const [stage, setStage]   = useState(STAGE_ENV)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  // Block copy / paste / context-menu globally
  useEffect(() => {
    const block = e => { e.preventDefault(); return false }
    document.addEventListener('copy',        block)
    document.addEventListener('cut',         block)
    document.addEventListener('paste',       block)
    document.addEventListener('contextmenu', block)
    return () => {
      document.removeEventListener('copy',        block)
      document.removeEventListener('cut',         block)
      document.removeEventListener('paste',       block)
      document.removeEventListener('contextmenu', block)
    }
  }, [])

  useEffect(() => {
    if (isExamLocked()) { navigate('/exam/completed', { replace: true }); return }
    try {
      const s = JSON.parse(sessionStorage.getItem('attempt') || '{}')
      if (s?.userId) { setUserId(s.userId); return }
    } catch {}
    const uid = sessionStorage.getItem('preexam_userId')
    if (uid) setUserId(uid)
    else navigate('/', { replace: true })
  }, [navigate])

  const handleStartExam = async () => {
    setLoading(true)
    try {
      clearAllSectionTimers()
      const data = await startExam(userId)
      sessionStorage.setItem('attempt', JSON.stringify({
        attemptId: data.attempt_id,
        userId:    data.user_id,
        expiresAt: data.expires_at,
        startedAt: data.started_at,
      }))
      navigate('/exam/mcq')
    } catch (err) {
      const d = err.response?.data
      if (d?.in_progress && d?.attempt_id) {
        sessionStorage.setItem('attempt', JSON.stringify({
          attemptId: d.attempt_id, userId, expiresAt: d.expires_at,
        }))
        navigate(`/exam/${d.current_section?.toLowerCase() || 'mcq'}`)
      } else if (d?.completed) {
        markExamCompleted(userId, d.attempt_id)
        navigate('/exam/completed', { replace: true })
      } else {
        setLoading(false)
      }
    }
  }

  if (!userId) return <div style={overlay}><div className="spinner" /></div>

  return (
    <>
      {stage === STAGE_ENV   && <StageEnvironment userId={userId} testMode={false} onNext={() => setStage(STAGE_GUIDE)} />}
      {stage === STAGE_GUIDE && <StageGuidelines userId={userId} testMode={false} onStartExam={handleStartExam} loading={loading} />}
    </>
  )
}

// ── Shared layout styles ──────────────────────────────────────────────────────
const overlay = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: C.bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-ui)',
}

const wrap = {
  width: '100%', maxWidth: 420,
  padding: '0 20px',
  margin: '0 auto',
}

const chipBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '5px 11px', fontSize: 12, fontWeight: 600,
  borderRadius: 8, border: '1px solid', cursor: 'pointer',
  fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
  flexShrink: 0,
}
