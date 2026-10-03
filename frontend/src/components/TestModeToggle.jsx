import { useTestMode } from '../utils/testMode'
import { toast } from './ToastProvider'

export default function TestModeToggle({ style = {} }) {
  const { testMode, toggle } = useTestMode()

  const handleToggle = (e) => {
    e.stopPropagation()
    toggle()
    if (!testMode) {
      toast.info('Test Mode ON: Background apps check bypassed for developer testing', 3000)
    } else {
      toast.warn('Candidate Mode ON: Strict background app checks and proctoring enabled', 3500)
    }
  }

  return (
    <div
      onClick={handleToggle}
      title={testMode ? "Test Mode is ON: Background apps check is bypassed. Click to switch to Candidate Mode." : "Candidate Mode is ON: Strict proctoring enabled. Click to switch to Test Mode."}
      style={{
        position: 'fixed',
        bottom: 12,
        left: 68,
        width: 'max-content',
        height: 'auto',
        zIndex: 1000000,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        background: testMode ? 'rgba(35, 134, 54, 0.15)' : 'rgba(22, 27, 34, 0.85)',
        border: `1px solid ${testMode ? 'rgba(63, 185, 80, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
        borderRadius: 20,
        fontSize: 11,
        fontFamily: 'var(--font-code, monospace)',
        color: testMode ? '#3fb950' : '#8b949e',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      <span style={{ fontSize: 13 }}>🧪</span>
      <span style={{ fontWeight: 600 }}>Test Mode:</span>
      <span style={{
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 10,
        fontSize: 10,
        background: testMode ? '#238636' : 'rgba(255, 255, 255, 0.08)',
        color: testMode ? '#ffffff' : '#8b949e',
        letterSpacing: '0.04em',
      }}>
        {testMode ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}
