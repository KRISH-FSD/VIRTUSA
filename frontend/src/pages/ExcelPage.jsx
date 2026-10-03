import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Bookmark, Send, Table as TableIcon, CheckCircle2, Clock, RotateCcw } from 'lucide-react'
import QuestionNavigator from '../components/QuestionNavigator'
import { getExcelQuestions, saveExcelAnswer, completeExcel } from '../services/api'
import { toast } from '../components/ToastProvider'
import { isUserCompleted } from '../utils/authLock'
import { useTestMode } from '../utils/testMode'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('attempt')) } catch { return null }
}

function renderMarkdownTable(md) {
  if (!md) return null;
  const lines = md.trim().split('\n');
  if (lines.length < 2 || !lines[1].includes('---')) return <div style={{ whiteSpace: 'pre' }}>{md}</div>; // Not a typical markdown table

  const parseRow = (line) => {
    const parts = line.split('|').map(s => s.trim());
    if (parts[0] === '') parts.shift();
    if (parts[parts.length - 1] === '') parts.pop();
    return parts;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div style={{ overflowX: 'auto', borderRadius: 4, border: '1px solid #30363d', marginTop: 12, marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, fontFamily: 'var(--font-ui)', background: '#0d1117' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '8px 12px', background: '#161b22', borderBottom: '1px solid #30363d', borderRight: i < headers.length - 1 ? '1px solid #30363d' : 'none', color: '#e6edf3', fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={{ padding: '8px 12px', borderBottom: rIdx < rows.length - 1 ? '1px solid #30363d' : 'none', borderRight: cIdx < row.length - 1 ? '1px solid #30363d' : 'none', color: '#c9d1d9', fontFamily: 'var(--font-code)', fontSize: 12 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ExcelPage() {
  const { testMode } = useTestMode()
  const navigate = useNavigate()
  const session = getSession()
  const attemptId = session?.attemptId

  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [markedForReview, setMarkedForReview] = useState(new Set())
  const [visited, setVisited] = useState(new Set())
  const [savedStatus, setSavedStatus] = useState({})
  const saveTimeoutRef = useRef({})

  useEffect(() => {
    if (!attemptId) { navigate('/', { replace: true }); return }
    if (session?.userId && isUserCompleted(session.userId)) {
      navigate('/exam/completed', { replace: true })
      return
    }

    getExcelQuestions(attemptId).then(data => {
      setQuestions(data.questions)
      if (data.expires_at) {
        const sess = getSession() || {}
        sess.expiresAt = data.expires_at
        sess.currentSection = 'EXCEL'
        sessionStorage.setItem('attempt', JSON.stringify(sess))
      }

      const saved = {}
      data.questions.forEach(q => { if (q.saved_answer) saved[q.id] = q.saved_answer })
      setAnswers(saved)

      const initialVisited = new Set()
      if (data.questions.length > 0) initialVisited.add(data.questions[0].id)
      data.questions.forEach(q => { if (q.saved_answer) initialVisited.add(q.id) })
      setVisited(initialVisited)
      setLoading(false)
    }).catch(err => {
      const msg = err.response?.data?.error || ''
      if (msg.includes('completed')) {
        navigate('/exam/completed', { replace: true })
      } else if (msg.includes('SQL') || msg.includes('CODING')) {
        navigate('/exam/sql', { replace: true })
      } else {
        setError(msg || 'Failed to load questions')
        setLoading(false)
      }
    })
  }, [attemptId, navigate, session?.userId])

  function handleInputChange(questionId, val) {
    setAnswers(prev => ({ ...prev, [questionId]: val }))
    setSavedStatus(prev => ({ ...prev, [questionId]: 'saving' }))

    // Debounce save to backend
    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId])
    }

    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      try {
        await saveExcelAnswer(attemptId, questionId, val)
        setSavedStatus(prev => ({ ...prev, [questionId]: 'saved' }))
      } catch {
        setSavedStatus(prev => ({ ...prev, [questionId]: 'error' }))
      }
    }, 600)
  }

  function markVisited(idx) {
    const qId = questions[idx]?.id
    if (qId) setVisited(prev => new Set(prev).add(qId))
  }

  function goNext() {
    if (currentIdx >= questions.length - 1) return
    const next = currentIdx + 1
    markVisited(next)
    setCurrentIdx(next)
  }

  function goPrev() {
    if (currentIdx <= 0) return
    const prev = currentIdx - 1
    markVisited(prev)
    setCurrentIdx(prev)
  }

  function goToQuestion(idx) {
    markVisited(idx)
    setCurrentIdx(idx)
  }

  function handleMarkReview() {
    const qId = questions[currentIdx]?.id
    if (!qId) return
    setMarkedForReview(prev => {
      const next = new Set(prev)
      if (next.has(qId)) next.delete(qId)
      else next.add(qId)
      return next
    })
  }

  // Auto-submit when section timer expires
  useEffect(() => {
    const onTimeout = () => {
      toast.warn('Time is up for Section 2! Submitting answers and moving to Section 3...')
      handleSubmitSection()
    }
    window.addEventListener('codeeval_section_timeout', onTimeout)
    return () => window.removeEventListener('codeeval_section_timeout', onTimeout)
  }, [attemptId])

  async function handleSubmitSection() {
    setSubmitting(true)
    setError('')

    try {
      const res = await completeExcel(attemptId)
      if (res?.expires_at) {
        const sess = getSession() || {}
        sess.expiresAt = res.expires_at
        sess.currentSection = res.current_section || 'SQL'
        sessionStorage.setItem('attempt', JSON.stringify(sess))
      }
      toast.success('Section 2 Completed! Proceeding to Section 3: SQL Assessment...')
      setTimeout(() => navigate(res?.next_route || '/exam/sql'), 600)
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed'
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        No questions found.
      </div>
    )
  }

  const q = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1
  const isFirst = currentIdx === 0
  const isMarked = markedForReview.has(q?.id)
  const currentAnswer = answers[q?.id] || ''
  const currentSaveStatus = savedStatus[q?.id] || (currentAnswer ? 'saved' : '')

  return (
    <div className="mcq-layout">
      {/* Left navigator */}
      <QuestionNavigator
        questions={questions}
        currentIndex={currentIdx}
        answers={answers}
        markedForReview={markedForReview}
        visited={visited}
        onNavigate={goToQuestion}
      />

      {/* Right: Question area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header + Breadcrumb */}
        <div style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-panel2)',
        }}>
          <div style={{
            padding: '8px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              Technical Assessment
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: 13, margin: '0 2px' }}>›</span>
            <span style={{ fontSize: 12, color: 'var(--text-white)', fontWeight: 600 }}>
              Section 2: Excel & Data Analysis
            </span>

            {/* Live save indicator */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              {currentSaveStatus === 'saving' && (
                <span style={{ fontSize: 11, color: 'var(--warning)', fontFamily: 'var(--font-code)' }}>
                  Saving...
                </span>
              )}
              {currentSaveStatus === 'saved' && (
                <span style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--font-code)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Color indicators */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '6px 20px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.15)',
          }}>
            {[
              { color: '#ffffff',  border: '#ffffff',              label: 'Current' },
              { color: '#3fb950',  border: 'rgba(63,185,80,0.6)',  label: 'Answered' },
              { color: '#f0883e',  border: 'rgba(240,136,62,0.6)', label: 'For Review' },
              { color: '#e05252',  border: 'rgba(224,82,82,0.6)',  label: 'Not Answered' },
              { color: '#6e7681',  border: 'rgba(110,118,129,0.5)', label: 'Not Visited' },
            ].map(({ color, border, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  border: `1.5px solid ${border}`,
                  flexShrink: 0,
                  opacity: 0.85,
                }} />
                <span style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-code)',
                  color: color,
                  letterSpacing: '0.02em',
                  opacity: 0.85,
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable question content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '60px 40px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '100%', 
            maxWidth: 800, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '40px'
          }}>
            {/* Top section: Context & Preview */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                marginBottom: 16,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{ width: 16, height: 2, background: 'var(--accent)' }} />
                Question {currentIdx + 1} of {questions.length}
              </div>

              {/* Question Title & Scenario */}
              <div style={{
                fontSize: 22,
                lineHeight: 1.5,
                fontWeight: 600,
                color: 'var(--text-white)',
                marginBottom: 12,
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.01em'
              }}>
                {q.title}
              </div>

              <div style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: '#c9d1d9',
                marginBottom: 24,
              }}>
                {q.scenario_description}
              </div>

              {/* Dataset preview if available */}
              {q.dataset_preview && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b949e', fontSize: 11, fontFamily: 'var(--font-code)', marginBottom: 8 }}>
                    <TableIcon size={14} /> Data Range Preview:
                  </div>
                  {renderMarkdownTable(q.dataset_preview)}
                </div>
              )}
            </div>

            {/* Bottom section: Question & Input */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Question Prompt */}
              <div style={{
                fontSize: 15,
                fontWeight: 500,
                color: '#e6edf3',
                lineHeight: 1.6,
                marginBottom: 16,
                padding: '16px 20px',
                background: 'rgba(56, 139, 253, 0.08)',
                borderLeft: '4px solid var(--accent)',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {q.question_prompt}
              </div>

              {/* Formula Bar / Answer Input */}
              <div style={{ marginTop: 24, width: '100%' }}>
                <label style={{
                  display: 'block',
                  fontSize: 11,
                  fontFamily: 'var(--font-code)',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                  Enter Formula / Answer
                </label>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  {/* fx Excel Icon */}
                  <div style={{
                    padding: '0 18px',
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 'bold',
                    fontSize: 18,
                    color: '#3fb950',
                    background: '#161b22',
                    borderRight: '1px solid #30363d',
                    userSelect: 'none',
                  }}>
                    fx
                  </div>

                  {/* Input field */}
                  <input
                    type="text"
                    value={currentAnswer}
                    onChange={e => handleInputChange(q.id, e.target.value)}
                    placeholder={q.placeholder || "=SUMIFS(...)"}
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                      flex: 1,
                      height: 52,
                      padding: '0 16px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontFamily: 'var(--font-code)',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-code)' }}>
                  Tip: You may write formulas with or without the leading '=' sign. Formulas are auto-saved as you type.
                </div>
              </div>

              {/* Error notice */}
              {error && (
                <div style={{
                  marginTop: 20,
                  padding: '12px 16px',
                  background: 'rgba(241,76,76,0.1)',
                  border: '1px solid var(--error)',
                  borderRadius: 6,
                  color: 'var(--error)',
                  fontSize: 13,
                  fontFamily: 'var(--font-code)',
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{
          padding: '12px 28px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Left: Previous */}
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="btn btn-secondary"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12,
              opacity: isFirst ? 0.35 : 1,
              cursor: isFirst ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowLeft size={13} />
            Previous
          </button>

          {/* Right: Review + Next / Submit Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleMarkReview}
              className="btn btn-secondary"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', fontSize: 12,
                color: isMarked ? '#f0883e' : 'var(--text-muted)',
                borderColor: isMarked ? 'rgba(240,136,62,0.6)' : 'var(--border)',
                background: isMarked ? 'rgba(240,136,62,0.12)' : 'transparent',
              }}
            >
              <Bookmark size={13} />
              {isMarked ? 'Marked' : 'Review'}
            </button>

            {isLast ? (
              testMode ? (
                <button
                  onClick={handleSubmitSection}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 18px', fontSize: 12 }}
                >
                  <Send size={13} />
                  {submitting ? 'Submitting...' : 'Submit & Next (Test Mode)'}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => goToQuestion(0)}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12 }}
                  >
                    <RotateCcw size={13} />
                    Back to Q1
                  </button>
                  <div
                    title="Section auto-submits when the 25-minute timer expires"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', fontSize: 11, fontWeight: 600,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 4, color: '#8b949e',
                      fontFamily: 'var(--font-code)',
                    }}
                  >
                    <Clock size={12} color="#8b949e" />
                    <span>Auto-submits on timer end</span>
                  </div>
                </div>
              )
            ) : (
              <button
                onClick={goNext}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', fontSize: 12 }}
              >
                Next
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
