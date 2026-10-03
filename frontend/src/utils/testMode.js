import { useState, useEffect } from 'react'

// ── Production lock: test mode is PERMANENTLY disabled ──────────────────────
// The TestModeToggle component is removed from the UI.
// Even if localStorage was previously set to 'true', we always return false.
const PRODUCTION_MODE = true  // set to false only during local development

export function getTestMode() {
  if (PRODUCTION_MODE) return false   // always false in production
  try {
    const val = localStorage.getItem('codeeval_test_mode')
    if (val === null) return false
    return val === 'true'
  } catch {
    return false
  }
}

export function setTestMode(enabled) {
  if (PRODUCTION_MODE) return  // no-op in production
  try {
    localStorage.setItem('codeeval_test_mode', String(enabled))
    window.dispatchEvent(new CustomEvent('codeeval_test_mode_changed', { detail: enabled }))
  } catch {}
}

export function useTestMode() {
  const [testMode, setTestModeState] = useState(getTestMode())

  useEffect(() => {
    // On mount, forcibly clear any stale test-mode flag from localStorage
    try {
      localStorage.removeItem('codeeval_test_mode')
    } catch {}

    if (PRODUCTION_MODE) return  // no listener needed in production

    const handler = (e) => {
      setTestModeState(e.detail)
    }
    window.addEventListener('codeeval_test_mode_changed', handler)
    return () => window.removeEventListener('codeeval_test_mode_changed', handler)
  }, [])

  const toggle = () => {
    if (PRODUCTION_MODE) return
    const next = !testMode
    setTestMode(next)
    setTestModeState(next)
  }

  return { testMode, toggle, setTestMode: (val) => { setTestMode(val); setTestModeState(val) } }
}
