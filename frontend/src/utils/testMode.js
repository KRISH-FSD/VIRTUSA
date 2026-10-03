import { useState, useEffect } from 'react'

export function getTestMode() {
  try {
    const val = localStorage.getItem('codeeval_test_mode')
    if (val === null) return false
    return val === 'true'
  } catch {
    return false
  }
}

export function setTestMode(enabled) {
  try {
    localStorage.setItem('codeeval_test_mode', String(enabled))
    window.dispatchEvent(new CustomEvent('codeeval_test_mode_changed', { detail: enabled }))
  } catch {}
}

export function useTestMode() {
  const [testMode, setTestModeState] = useState(getTestMode())

  useEffect(() => {
    const handler = (e) => {
      setTestModeState(e.detail)
    }
    window.addEventListener('codeeval_test_mode_changed', handler)
    return () => window.removeEventListener('codeeval_test_mode_changed', handler)
  }, [])

  const toggle = () => {
    const next = !testMode
    setTestMode(next)
    setTestModeState(next)
  }

  return { testMode, toggle, setTestMode: (val) => { setTestMode(val); setTestModeState(val) } }
}
