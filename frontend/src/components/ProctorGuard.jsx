import { useState, useEffect, useCallback, useRef } from 'react'
import { Maximize2, RefreshCw, AlertTriangle, Monitor, Terminal, ShieldAlert, CheckCircle, ArrowRight, Zap } from 'lucide-react'
import { checkSystemEnvironment, closeDisallowedApps, completeMCQ, submitCode } from '../services/api'
import { useTestMode } from '../utils/testMode'
import { toast } from './ToastProvider'
import { markExamCompleted } from '../utils/authLock'

export default function ProctorGuard({ active = true }) {
  const { testMode } = useTestMode()
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const [appCheck, setAppCheck] = useState({ loading: false, clean: true, disallowed: [] })
  const [checking, setChecking] = useState(false)

  // Switch Tracking: strictly 1 count per exit event, debounced
  const [switchCount, setSwitchCount] = useState(0)
  const [showSwitchWarning, setShowSwitchWarning] = useState(false)
  const switchCountRef = useRef(0)
  const isAwayRef = useRef(false)
  const lastExitTimeRef = useRef(0)

  // Fullscreen Exit Tracking (separate from window switch counter)
  const MAX_FULLSCREEN_EXITS = 5
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0)
  const fullscreenExitCountRef = useRef(0)
  const lastFullscreenExitRef = useRef(0)

  // Auto-submit the assessment when violations exceed limit
  const autoSubmitAssessment = async (reason) => {
    try {
      const session = JSON.parse(sessionStorage.getItem('attempt') || '{}')
      const attemptId = session?.attemptId
      const userId = session?.userId

      sessionStorage.setItem('codeeval_auto_submitted', 'true')
      sessionStorage.setItem('codeeval_auto_submit_reason', reason || 'Maximum allowed exit attempts exceeded.')

      if (userId) {
        markExamCompleted(userId, attemptId)
      }

      // Automatically complete in backend
      if (attemptId) {
        try {
          if (window.location.pathname.includes('/mcq')) {
            await completeMCQ(attemptId)
          } else if (window.location.pathname.includes('/coding')) {
            await submitCode(attemptId, '# Auto-submitted due to proctoring violation')
          }
        } catch (apiErr) {
          console.warn('Backend auto-submit notice:', apiErr)
        }
      }
    } catch (e) {
      console.error('Auto-submit error:', e)
    }

    window.__ALLOW_NAVIGATE__ = true
    window.location.replace('/exam/completed')
  }

  // Record a fullscreen exit violation (separate limit: 5 exits) — Candidate Mode only
  const triggerFullscreenExitWarning = useCallback(() => {
    if (testMode) return // Skip in test mode
    const now = Date.now()
    // Debounce: ignore rapid duplicate events within 1.5s
    if (now - lastFullscreenExitRef.current < 1500) return
    lastFullscreenExitRef.current = now

    fullscreenExitCountRef.current += 1
    const count = fullscreenExitCountRef.current
    setFullscreenExitCount(count)

    if (count > MAX_FULLSCREEN_EXITS) {
      autoSubmitAssessment(`Maximum allowed fullscreen exits exceeded (${MAX_FULLSCREEN_EXITS} violations recorded). Assessment auto-submitted.`)
    }
  }, [testMode])

  // Record an exit violation: strictly 1 count per window switch / exit — Candidate Mode only
  const triggerSwitchWarning = useCallback(() => {
    if (testMode) return // Skip in test mode
    const now = Date.now()
    // Debounce: if already marked away or if within 2.5s of previous exit, ignore duplicates
    if (isAwayRef.current || (now - lastExitTimeRef.current < 2500)) {
      return
    }
    isAwayRef.current = true
    lastExitTimeRef.current = now

    switchCountRef.current += 1
    const currentCount = switchCountRef.current

    // If user switches/exits more than 3 times (> 3), auto-submit
    if (currentCount > 3) {
      autoSubmitAssessment('Maximum allowed window switch / exit attempts exceeded (3 violations recorded).')
      return
    }

    setSwitchCount(currentCount)
    setShowSwitchWarning(true)
  }, [testMode])

  const runCheck = useCallback(async () => {
    if (testMode) {
      setAppCheck({ loading: false, clean: true, disallowed: [] })
      return
    }

    setChecking(true)
    try {
      const res = await checkSystemEnvironment()
      setAppCheck({
        loading: false,
        clean: res.clean,
        disallowed: res.disallowed_apps || [],
      })
    } catch {
      setAppCheck({ loading: false, clean: true, disallowed: [] })
    } finally {
      setChecking(false)
    }
  }, [testMode])

  const [closing, setClosing] = useState(false)

  const handleAutoClose = useCallback(async () => {
    setClosing(true)
    try {
      const res = await closeDisallowedApps()
      setAppCheck({
        loading: false,
        clean: res.clean,
        disallowed: res.disallowed_apps || [],
      })
    } catch {
      await runCheck()
    } finally {
      setClosing(false)
    }
  }, [runCheck])

  // ── Keyboard Lock and System Prevention ──────────────────────────────
  useEffect(() => {
    if (!active) return

    // 1. Chrome Keyboard Lock API (Locks Escape, Alt+Tab, Windows Key in Full Screen)
    const lockKeyboard = async () => {
      try {
        if (document.fullscreenElement && navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
          await navigator.keyboard.lock([
            'Escape',
            'F11',
            'AltLeft',
            'AltRight',
            'Tab',
            'MetaLeft',
            'MetaRight',
            'ContextMenu',
          ])
        }
      } catch (err) {
        console.warn('Keyboard lock:', err)
      }
    }

    lockKeyboard()

    // 2. Intercept and block window switching & reload shortcuts
    const handleKeyDown = (e) => {
      // ── Block Page Reload: Ctrl+R, Ctrl+Shift+R, F5, Ctrl+F5, Cmd+R ──
      const k = (e.key || '').toLowerCase()
      const c = e.code || ''
      const kc = e.keyCode || e.which

      const isReloadKey =
        k === 'f5' ||
        c === 'F5' ||
        kc === 116 ||
        k === 'browserrefresh' ||
        ((e.ctrlKey || e.metaKey) && (k === 'r' || c === 'KeyR' || kc === 82))

      if (isReloadKey) {
        e.preventDefault()
        e.stopPropagation()
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()
        e.returnValue = false
        return false
      }

      // Block Alt key (Alt+Tab, Alt+F4)
      if (e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Windows / Meta key
      if (e.key === 'Meta' || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Handle F11 specifically to trigger HTML5 Fullscreen
      if (e.key === 'F11') {
        e.preventDefault()
        e.stopPropagation()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('F11 fullscreen failed:', err)
          })
        }
        return false
      }

      // Block Escape
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block Tab closing / opening shortcuts: Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Q
      if ((e.ctrlKey || e.metaKey) && ['w', 'W', 't', 'T', 'n', 'N', 'q', 'Q'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }

      // Block DevTools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        e.keyCode === 123 ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    // 3. Block right-click context menu (prevents right-click -> Reload)
    const handleContextMenu = (e) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // 4. Browser refresh/close button → stamp a pending flag in localStorage so
    //    the app can auto-submit when it reloads after the refresh.
    const handleBeforeUnload = () => {
      if (testMode || window.__ALLOW_NAVIGATE__ || window.location.pathname === '/exam/completed') return
      try {
        const session = JSON.parse(sessionStorage.getItem('attempt') || '{}')
        if (session?.attemptId) {
          localStorage.setItem('codeeval_refresh_pending', JSON.stringify({
            attemptId: session.attemptId,
            userId: session.userId,
            path: window.location.pathname,
            ts: Date.now(),
          }))
        }
      } catch {}
      // Do NOT call e.preventDefault() — let the reload happen freely.
      // The auto-submit runs when the page reloads.
    }

    // 5. Alt-Tab / Window Blur / Visibility Loss (Single debounced exit per event)
    const handleBlur = () => {
      triggerSwitchWarning()
    }

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerSwitchWarning()
      }
    }

    const handleFocus = () => {
      isAwayRef.current = false
      lockKeyboard()
      if (!testMode) runCheck()
    }

    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement)
      setIsFullscreen(inFullscreen)
      lockKeyboard()
      // Track fullscreen EXITS (not entries)
      if (!inFullscreen) {
        triggerFullscreenExitWarning()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('contextmenu', handleContextMenu, true)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('contextmenu', handleContextMenu, true)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
        try { navigator.keyboard.unlock() } catch {}
      }
    }
  }, [active, triggerSwitchWarning, triggerFullscreenExitWarning, runCheck, testMode])

  useEffect(() => {
    runCheck()
  }, [runCheck])

  const requestFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      }
      setIsFullscreen(true)
      if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
        await navigator.keyboard.lock(['Escape', 'F11', 'AltLeft', 'AltRight', 'Tab', 'MetaLeft', 'MetaRight'])
      }
    } catch (err) {
      console.warn('Fullscreen request blocked', err)
    }
  }

  const handleDismissWarning = async () => {
    setShowSwitchWarning(false)
    isAwayRef.current = false
    if (!document.fullscreenElement) {
      await requestFullScreen()
    }
  }

  if (!active) return null

  // ── Render on the SAME UI (Semi-transparent backdrop keeping questions/editor visible) ──

  // Case 1: Alt-Tab / Window Switch Warning (Candidate Mode only — skip in Test Mode)
  if (!testMode && showSwitchWarning) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: 24,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '8px 18px',
          background: 'rgba(18, 20, 26, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(248, 81, 73, 0.8)',
          borderRadius: 40,
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(248, 81, 73, 0.25)',
          maxWidth: '92vw',
          animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '3px 10px',
            background: 'rgba(248, 81, 73, 0.12)',
            border: '1px solid rgba(248, 81, 73, 0.45)',
            borderRadius: 20,
            color: '#ff7b72',
            fontSize: 11,
            fontFamily: 'var(--font-code, monospace)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#f85149',
              boxShadow: '0 0 8px #f85149',
              animation: 'pulseGlow 2s infinite ease-in-out',
            }} />
            <AlertTriangle size={13} color="#f85149" />
            <span>Window Switch Detected</span>
          </div>

          {/* Text */}
          <div style={{
            fontSize: 12,
            color: '#f0f6fc',
            fontFamily: 'var(--font-ui, sans-serif)',
            whiteSpace: 'nowrap',
          }}>
            Window switch detected. Please remain inside the assessment tab.
          </div>

          {testMode && (
            <span style={{
              background: 'rgba(56, 139, 253, 0.12)',
              border: '1px solid rgba(56, 139, 253, 0.3)',
              color: '#58a6ff',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 10,
              fontFamily: 'var(--font-code, monospace)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              Test Mode
            </span>
          )}

          {/* Action button */}
          <button
            onClick={handleDismissWarning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(180deg, #da3633 0%, #b62324 100%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(218, 54, 51, 0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Resume</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    )
  }

  // Case 2: Full Screen Required (Candidate Mode only — skip in Test Mode)
  if (!testMode && !isFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: 24,
      }}>
      <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '8px 18px',
          background: 'rgba(18, 20, 26, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(248, 81, 73, 0.8)',
          borderRadius: 40,
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(248, 81, 73, 0.25)',
          maxWidth: '92vw',
          animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '3px 10px',
            background: 'rgba(248, 81, 73, 0.12)',
            border: '1px solid rgba(248, 81, 73, 0.45)',
            borderRadius: 20,
            color: '#ff7b72',
            fontSize: 11,
            fontFamily: 'var(--font-code, monospace)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            <Maximize2 size={13} color="#f85149" />
            <span>Full Screen Mode</span>
          </div>

          <div style={{
            fontSize: 12,
            color: '#f0f6fc',
            fontFamily: 'var(--font-ui, sans-serif)',
            whiteSpace: 'nowrap',
          }}>
            Assessment requires Full Screen. Please press F11 or click to continue.
          </div>

          {/* Violation counter — shown after first exit */}
          {fullscreenExitCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              background: fullscreenExitCount >= MAX_FULLSCREEN_EXITS
                ? 'rgba(248, 81, 73, 0.25)'
                : 'rgba(248, 81, 73, 0.08)',
              border: '1px solid rgba(248, 81, 73, 0.45)',
              borderRadius: 20,
              color: '#ff7b72',
              fontSize: 11,
              fontFamily: 'var(--font-code, monospace)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              {fullscreenExitCount}/{MAX_FULLSCREEN_EXITS} exits
            </div>
          )}

          <button
            onClick={requestFullScreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(180deg, #da3633 0%, #b62324 100%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(218, 54, 51, 0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            <Maximize2 size={12} />
            <span>Enter Full Screen (F11)</span>
          </button>
        </div>
      </div>
    )
  }

  // Case 3: Disallowed Background Apps (Candidate Mode only)
  if (!testMode && !appCheck.clean) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>
        <div className="fade-in" style={{
          maxWidth: 460,
          width: '100%',
          background: 'var(--bg-panel, #1e1e1e)',
          border: '1px solid var(--border, #333333)',
          borderRadius: 6,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid var(--border, #333333)',
            fontSize: 11,
            fontFamily: 'var(--font-code, monospace)',
            color: 'var(--text-white, #ffffff)',
          }}>
            <Terminal size={14} color="var(--accent, #007acc)" />
            <span style={{ fontWeight: 600, letterSpacing: '0.06em' }}>ENVIRONMENT CHECK</span>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-white, #ffffff)',
              marginBottom: 8,
            }}>
              Close all apps. Open only Chrome to proceed the assessment.
            </div>

            <div style={{
              fontSize: 12,
              color: 'var(--text-muted, #8b949e)',
              marginBottom: 12,
              lineHeight: 1.5,
            }}>
              The following background applications must be closed:
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {appCheck.disallowed.map(app => (
                <span key={app} style={{
                  background: 'rgba(56, 139, 253, 0.1)',
                  color: '#79c0ff',
                  border: '1px solid rgba(56, 139, 253, 0.25)',
                  fontSize: 11,
                  fontFamily: 'var(--font-code, monospace)',
                  padding: '3px 8px',
                  borderRadius: 3,
                }}>
                  {app}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={runCheck}
                disabled={checking || closing}
                className="btn btn-ghost"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '8px 14px',
                  fontSize: 12,
                  gap: 6,
                }}
              >
                <RefreshCw size={12} className={checking ? 'spin' : ''} />
                {checking ? 'Checking...' : 'Re-check Apps'}
              </button>

              <button
                onClick={handleAutoClose}
                disabled={checking || closing}
                className="btn"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '8px 14px',
                  fontSize: 12,
                  gap: 6,
                  color: '#f85149',
                  background: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.3)',
                }}
              >
                <Zap size={12} />
                {closing ? 'Closing...' : 'Close Apps for Me'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
