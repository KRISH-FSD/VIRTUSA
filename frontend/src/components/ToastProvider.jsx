import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Global toast notification system.
 * Usage: import { useToast } from '../components/ToastProvider'
 *        const toast = useToast()
 *        toast.success('Answer saved')
 *        toast.warn('5 minutes remaining!')
 *        toast.error('Submission failed')
 *        toast.info('Loading...')
 */

import { createContext, useContext } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle  size={14} color="#10b981" style={{ flexShrink: 0 }} />,
  warn:    <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />,
  error:   <XCircle      size={14} color="#ef4444" style={{ flexShrink: 0 }} />,
  info:    <Info          size={14} color="#38bdf8" style={{ flexShrink: 0 }} />,
}

const COLORS = {
  success: { border: 'rgba(16, 185, 129, 0.35)', bg: 'rgba(16, 185, 129, 0.08)' },
  warn:    { border: 'rgba(245, 158, 11, 0.35)', bg: 'rgba(245, 158, 11, 0.08)' },
  error:   { border: 'rgba(239, 68, 68, 0.35)',  bg: 'rgba(239, 68, 68, 0.08)' },
  info:    { border: 'rgba(56, 189, 248, 0.35)', bg: 'rgba(56, 189, 248, 0.08)' },
}

let _addToast = null
export function toast(type, message, duration = 2800) {
  if (_addToast) _addToast({ type, message, duration })
}
toast.success = (m, d) => toast('success', m, d)
toast.warn    = (m, d) => toast('warn', m, d)
toast.error   = (m, d) => toast('error', m, d)
toast.info    = (m, d) => toast('info', m, d)

function ToastItem({ id, type, message, onRemove }) {
  const [exiting, setExiting] = useState(false)

  function dismiss() {
    setExiting(true)
    setTimeout(() => onRemove(id), 160)
  }

  const c = COLORS[type] || COLORS.info

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: 'rgba(17, 24, 39, 0.94)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${c.border}`,
        borderRadius: 20,
        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.3)',
        color: 'var(--text-normal, #e2e8f0)',
        fontSize: 12.5,
        fontWeight: 500,
        fontFamily: 'var(--font-ui, system-ui, sans-serif)',
        animation: exiting ? 'toastOutTop 160ms ease-in forwards' : 'toastInTop 180ms ease-out forwards',
        userSelect: 'none',
        maxWidth: '85vw',
      }}
    >
      {ICONS[type]}
      <span style={{ color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {message}
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted, #94a3b8)',
          padding: 2,
          marginLeft: 4,
          display: 'flex',
          alignItems: 'center',
          opacity: 0.7,
          transition: 'opacity 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
      >
        <X size={12} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const addToast = useCallback(({ type, message, duration = 2800 }) => {
    const id = ++idRef.current
    setToasts(prev => {
      // If message is already actively shown, don't duplicate
      if (prev.some(t => t.message === message)) return prev
      // Keep up to 2 minimal toasts simultaneously
      const next = prev.length >= 2 ? prev.slice(-1) : prev
      return [...next, { id, type, message }]
    })
    setTimeout(() => removeToast(id), duration)
  }, [])

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => {
    _addToast = addToast
    return () => { _addToast = null }
  }, [addToast])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container — top center, high z-index above all overlays */}
      <div style={{
        position: 'fixed',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem {...t} onRemove={removeToast} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastInTop {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastOutTop {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-12px) scale(0.95); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

