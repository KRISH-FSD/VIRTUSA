import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

export default function MCQOption({ optionKey, keyLabel, text, selected, onSelect, onClick }) {
  const [flash, setFlash] = useState(false)
  const [hover, setHover] = useState(false)
  const handleClick = onSelect || onClick
  const displayKey = keyLabel || optionKey

  // Trigger brief flash animation on selection
  useEffect(() => {
    if (selected) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 250)
      return () => clearTimeout(t)
    }
  }, [selected])

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick?.()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        border: selected ? '2px solid var(--accent, #007acc)' : (hover ? '2px solid #58a6ff' : '2px solid #30363d'),
        background: selected ? 'rgba(56, 139, 253, 0.12)' : (hover ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.02)'),
        borderRadius: 10,
        cursor: 'pointer',
        userSelect: 'none',
        transform: flash ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 150ms ease',
        boxShadow: selected ? '0 0 0 1px rgba(88,166,255,0.4)' : (hover ? '0 4px 12px rgba(0,0,0,0.1)' : 'none')
      }}
    >
      {/* Option Key Badge (A, B, C, D) */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: selected ? '1.5px solid var(--accent, #007acc)' : (hover ? '1.5px solid #58a6ff' : '1px solid #484f58'),
          background: selected ? 'var(--accent, #007acc)' : (hover ? '#1f2428' : '#161b22'),
          color: selected ? '#ffffff' : (hover ? '#c9d1d9' : '#8b949e'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-code, monospace)',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          transition: 'all 150ms ease',
        }}
      >
        {selected ? <Check size={14} strokeWidth={3} /> : displayKey}
      </div>

      {/* Option Text */}
      <span style={{
        flex: 1,
        fontSize: 15,
        lineHeight: 1.6,
        color: selected ? '#ffffff' : (hover ? '#ffffff' : '#c9d1d9'),
        fontWeight: selected ? 500 : 400,
        transition: 'color 150ms ease',
      }}>
        {text}
      </span>
    </div>
  )
}
