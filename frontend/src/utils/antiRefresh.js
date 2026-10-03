import { toast } from '../components/ToastProvider'
import { getTestMode } from './testMode'

let isInitialized = false

/**
 * Global Anti-Refresh & Navigation Guardian
 * Intercepts all attempts to reload or navigate away via:
 * - Ctrl+R / Ctrl+Shift+R / Cmd+R / Cmd+Shift+R
 * - F5 / Ctrl+F5 / Shift+F5
 * - BrowserRefresh multimedia keys
 * - Alt + Left / Right arrow (history back/forward)
 * - Backspace outside text fields
 * - Right-click context menu (Reload option)
 * - Mouse navigation buttons (back/forward)
 * - Browser native reload button (via beforeunload prompt)
 */
export function initAntiRefresh() {
  if (isInitialized || typeof window === 'undefined') return
  isInitialized = true

  const isReloadAttempt = (e) => {
    const key = (e.key || '').toLowerCase()
    const code = e.code || ''
    const keyCode = e.keyCode || e.which

    // F5, Ctrl+F5, Shift+F5
    if (key === 'f5' || code === 'F5' || keyCode === 116 || key === 'browserrefresh') {
      return true
    }

    // Ctrl+R, Ctrl+Shift+R, Cmd+R, Cmd+Shift+R, Alt+R
    if ((e.ctrlKey || e.metaKey) && (key === 'r' || code === 'KeyR' || keyCode === 82)) {
      return true
    }

    return false
  }

  const isNavigationAttempt = (e) => {
    const key = (e.key || '').toLowerCase()
    const code = e.code || ''
    const keyCode = e.keyCode || e.which

    // Close / New tab shortcuts: Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Q
    if ((e.ctrlKey || e.metaKey) && ['w', 't', 'n', 'q'].includes(key)) {
      return true
    }

    // Alt + LeftArrow / Alt + RightArrow (Browser history navigation)
    if (e.altKey && (key === 'arrowleft' || key === 'arrowright' || keyCode === 37 || keyCode === 39)) {
      return true
    }

    return false
  }

  let lastToastTime = 0
  const showReloadToast = () => {
    const now = Date.now()
    if (now - lastToastTime > 2500) {
      lastToastTime = now
      toast.warn('Page reload is strictly disabled during the assessment', 2500)
    }
  }

  const handleKeydown = (e) => {
    if (isReloadAttempt(e)) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      e.returnValue = false
      showReloadToast()
      return false
    }

    if (isNavigationAttempt(e)) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      e.returnValue = false
      return false
    }
  }

  // Intercept at capture phase on window (catches everything before document or elements)
  window.addEventListener('keydown', handleKeydown, { capture: true, passive: false })
  window.addEventListener('keyup', (e) => {
    if (isReloadAttempt(e) || isNavigationAttempt(e)) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }
  }, { capture: true, passive: false })

  // Disable right-click context menu (prevents right-click -> Reload)
  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }
  window.addEventListener('contextmenu', handleContextMenu, { capture: true })
  document.addEventListener('contextmenu', handleContextMenu, { capture: true })

  // Disable mouse back/forward buttons
  const handleMouseButton = (e) => {
    if (e.button === 3 || e.button === 4) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      return false
    }
  }
  window.addEventListener('mouseup', handleMouseButton, { capture: true })
  window.addEventListener('auxclick', handleMouseButton, { capture: true })

  // Native beforeunload: silently stamp a pending-refresh flag so the app
  // auto-submits when it reloads. No native dialog shown.
  window.addEventListener('beforeunload', () => {
    if (getTestMode() || window.__ALLOW_NAVIGATE__ || window.location.pathname === '/exam/completed') return
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
  })

  // Disable multi-touch gestures (pinch, multi-finger taps/swipes)
  const handleTouch = (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault()
    }
  }
  window.addEventListener('touchstart', handleTouch, { passive: false })
  window.addEventListener('touchmove', handleTouch, { passive: false })

  // Disable pinch-zoom or Ctrl+Wheel zoom
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
    }
  }, { passive: false })

  // ── Disable Copy / Cut / Paste globally ──────────────────────────────
  const blockClipboard = (e) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }
  document.addEventListener('copy',  blockClipboard, { capture: true })
  document.addEventListener('cut',   blockClipboard, { capture: true })
  document.addEventListener('paste', blockClipboard, { capture: true })

  // ── Block PrintScreen / Screenshot shortcuts ──────────────────────────
  window.addEventListener('keydown', (e) => {
    // PrintScreen key
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      e.preventDefault()
      e.stopImmediatePropagation()
      // Briefly blank the screen to prevent screengrab content
      const shield = document.createElement('div')
      shield.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647;'
      document.body.appendChild(shield)
      setTimeout(() => document.body.removeChild(shield), 300)
      return false
    }
    // Ctrl+Shift+S (screen capture shortcuts on some OS)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      e.stopImmediatePropagation()
      return false
    }
  }, { capture: true, passive: false })

  // Block popstate back/forward navigation
  window.addEventListener('popstate', (e) => {
    window.history.pushState(null, '', window.location.href)
  })
}
