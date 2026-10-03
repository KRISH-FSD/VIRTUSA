const STATUS_COLORS = {
  current:   { bg: 'var(--accent)',           text: '#ffffff', border: 'var(--accent)' },
  review:    { bg: 'rgba(240,136,62,0.15)',   text: '#f0883e', border: '#f0883e' },
  answered:  { bg: 'rgba(63,185,80,0.15)',    text: '#3fb950', border: '#3fb950' },
  unanswered:{ bg: 'rgba(224,82,82,0.1)',     text: '#e05252', border: '#e05252' },
  unvisited: { bg: '#21262d',                 text: '#8b949e', border: '#30363d' },
}

function getStatus(i, currentIndex, answered, marked, isVisited) {
  if (i === currentIndex) return 'current'
  if (marked)             return 'review'
  if (answered)           return 'answered'
  if (!isVisited)         return 'unvisited'
  return 'unanswered'
}

export default function QuestionNavigator({ questions, currentIndex, answers, markedForReview = new Set(), visited = new Set(), onNavigate }) {
  const answeredCount = Object.keys(answers).length
  const remaining = questions.length - answeredCount

  return (
    <div style={{
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        fontFamily: 'var(--font-code)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-white)',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Questions Map</span>
      </div>

      {/* Question Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 14px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        alignContent: 'start',
      }}>
        {questions.map((q, i) => {
          const isAnswered = !!answers[q.id]
          const isMarked   = markedForReview.has(q.id)
          const isVisited  = visited.has(q.id)
          const status     = getStatus(i, currentIndex, isAnswered, isMarked, isVisited)
          const c          = STATUS_COLORS[status]
          const isCurrent  = i === currentIndex

          return (
            <div
              key={q.id}
              onClick={() => onNavigate?.(i)}
              title={`Question ${i + 1}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 34,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'var(--font-code)',
                fontSize: 12,
                fontWeight: isCurrent ? 700 : 600,
                color: c.text,
                background: c.bg,
                border: `1px solid ${c.border}`,
                boxShadow: isCurrent ? `0 0 0 2px rgba(88,166,255,0.3)` : 'none',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) e.currentTarget.style.filter = 'brightness(1.3)';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.filter = 'none';
              }}
            >
              {i + 1}
            </div>
          )
        })}
      </div>

      {/* Legend / Status Indicators */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3fb950' }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: '#8b949e' }}>Answered</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0883e' }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: '#8b949e' }}>Review</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05252' }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: '#8b949e' }}>Unanswered</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6e7681' }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: '#8b949e' }}>Unvisited</span>
        </div>
      </div>

      {/* Bottom stats panel */}
      <div style={{
        padding: '14px 14px',
        flexShrink: 0,
        background: 'var(--bg-panel2)',
      }}>
        {/* Answered */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: '#c9d1d9', fontWeight: 600 }}>Completed</span>
          <span style={{
            fontSize: 13,
            fontFamily: 'var(--font-code)',
            fontWeight: 700,
            color: '#3fb950',
          }}>
            {answeredCount} <span style={{ color: '#8b949e', fontSize: 11 }}>/ {questions.length}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6,
          borderRadius: 3,
          background: '#21262d',
          overflow: 'hidden',
          marginTop: 10,
        }}>
          <div style={{
            height: '100%',
            width: questions.length > 0 ? `${(answeredCount / questions.length) * 100}%` : '0%',
            background: answeredCount === questions.length ? '#3fb950' : 'var(--accent)',
            borderRadius: 3,
            transition: 'width 300ms ease, background 300ms ease',
          }} />
        </div>
      </div>
    </div>
  )
}
