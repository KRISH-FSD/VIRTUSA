import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * ResizableSplit — horizontal split panel with a draggable divider.
 * Props:
 *   left         — left pane content (JSX)
 *   right        — right pane content (JSX)
 *   defaultLeft  — initial left width in px (default 320)
 *   minLeft      — minimum left width in px (default 200)
 *   maxLeft      — maximum left width in px (default 600)
 *   style        — container style
 */
export default function ResizableSplit({
  left,
  right,
  defaultLeft = 45,
  minPercent = 25,
  maxPercent = 75,
  style = {},
}) {
  const [leftPercent, setLeftPercent] = useState(() => (defaultLeft > 100 ? (defaultLeft / 1200) * 100 : defaultLeft))
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef(null)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return

    function onMouseMove(e) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100
      setLeftPercent(Math.min(maxPercent, Math.max(minPercent, newPercent)))
    }

    function onMouseUp() {
      setDragging(false)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, minPercent, maxPercent])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        userSelect: dragging ? 'none' : 'auto',
        cursor: dragging ? 'col-resize' : 'auto',
        ...style,
      }}
    >
      {/* Left pane */}
      <div style={{ width: `${leftPercent}%`, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {left}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          width: 5,
          flexShrink: 0,
          background: dragging ? 'var(--accent)' : 'var(--border)',
          cursor: 'col-resize',
          transition: 'background 150ms ease',
          position: 'relative',
          zIndex: 10,
        }}
        title="Drag to resize panels"
      >
        {/* Visual hint dots */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          opacity: dragging ? 0 : 0.5,
          transition: 'opacity 150ms',
          pointerEvents: 'none',
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-muted)' }} />
          ))}
        </div>
      </div>

      {/* Right pane */}
      <div style={{ width: `${100 - leftPercent}%`, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {right}
      </div>
    </div>
  )
}
