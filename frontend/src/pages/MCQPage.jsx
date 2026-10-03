import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Send, ArrowLeft, Bookmark, Clock, RotateCcw } from 'lucide-react'
import QuestionNavigator from '../components/QuestionNavigator'
import MCQOption from '../components/MCQOption'
import { getMCQs, saveMCQAnswer, completeMCQ } from '../services/api'
import { toast } from '../components/ToastProvider'
import { isUserCompleted } from '../utils/authLock'
import { useTestMode } from '../utils/testMode'
import { Highlight, themes } from 'prism-react-renderer'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('attempt')) } catch { return null }
}

export default function MCQPage() {
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
  const savingRef = useRef({})

  useEffect(() => {
    if (!attemptId) { navigate('/', { replace: true }); return }
    if (session?.userId && isUserCompleted(session.userId)) {
      navigate('/exam/completed', { replace: true })
      return
    }

    getMCQs(attemptId).then(data => {
      setQuestions(data.questions)
      if (data.expires_at) {
        const sess = getSession() || {}
        sess.expiresAt = data.expires_at
        sess.currentSection = 'MCQ'
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
      } else if (msg.includes('EXCEL') || msg.includes('SQL') || msg.includes('CODING')) {
        navigate('/exam/excel', { replace: true })
      } else {
        setError(msg || 'Failed to load questions')
        setLoading(false)
      }
    })
  }, [attemptId, navigate, session?.userId])

  async function handleSelectAnswer(questionId, answer) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))

    if (savingRef.current[questionId]) return
    savingRef.current[questionId] = true

    try {
      await saveMCQAnswer(attemptId, questionId, answer)
    } catch {
      toast.error('Failed to save answer')
    } finally {
      savingRef.current[questionId] = false
    }
  }

  function handleOptionClick(questionId, answer) {
    savingRef.current[questionId] = false
    handleSelectAnswer(questionId, answer)
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

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentIdx, questions.length])

  // Auto-submit when section timer expires
  useEffect(() => {
    const onTimeout = () => {
      toast.warn('Time is up for Section 1! Submitting answers and moving to Section 2...')
      handleSubmitMCQ()
    }
    window.addEventListener('codeeval_section_timeout', onTimeout)
    return () => window.removeEventListener('codeeval_section_timeout', onTimeout)
  }, [attemptId])

  async function handleSubmitMCQ() {
    setSubmitting(true)
    setError('')

    try {
      const res = await completeMCQ(attemptId)
      if (res?.expires_at) {
        const sess = getSession() || {}
        sess.expiresAt = res.expires_at
        sess.currentSection = res.current_section || 'EXCEL'
        sessionStorage.setItem('attempt', JSON.stringify(sess))
      }
      toast.success('Section 1 Completed! Proceeding to Section 2: Excel Data Analysis...')
      setTimeout(() => navigate(res?.next_route || '/exam/excel'), 600)
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
  const answeredCount = Object.keys(answers).length

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

      {/* Right: question area */}
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
              Section 1: Programming Language MCQ
            </span>

            {/* Keyboard hint */}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-code)' }}>
              ← → to navigate
            </span>
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
              { color: '#ffffff', border: '#ffffff', label: 'Current' },
              { color: '#3fb950', border: 'rgba(63,185,80,0.6)', label: 'Answered' },
              { color: '#f0883e', border: 'rgba(240,136,62,0.6)', label: 'For Review' },
              { color: '#e05252', border: 'rgba(224,82,82,0.6)', label: 'Not Answered' },
              { color: '#6e7681', border: 'rgba(110,118,129,0.5)', label: 'Not Visited' },
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 32px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column' }}>

            {/* Question title */}
            <div style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: 'var(--text-white)',
              fontWeight: 600,
              marginBottom: 28,
              fontFamily: 'var(--font-ui)',
              letterSpacing: '-0.01em'
            }}>
              {q.question}
            </div>

            {/* Code snippet if present */}
            {q.code_snippet && (
              <div style={{ marginBottom: 32 }}>
                <Highlight
                  theme={themes.vsDark}
                  code={q.code_snippet}
                  language={q.question.toLowerCase().includes('python') ? 'python' : (q.question.toLowerCase().includes(' c ') || q.question.toLowerCase().includes(' c?')) ? 'c' : 'javascript'}
                >
                  {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <pre style={{
                      ...style,
                      background: '#0d1117',
                      border: '1px solid var(--border)',
                      borderLeft: '4px solid var(--accent)',
                      borderRadius: 6,
                      padding: '16px 20px',
                      fontFamily: 'var(--font-code)',
                      fontSize: 14,
                      lineHeight: 1.6,
                      overflowX: 'auto',
                      margin: 0,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }} className={className}>
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              </div>
            )}

            {/* Options A, B, C, D */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['A', 'B', 'C', 'D'].map(key => {
                const optText = q[`option_${key.toLowerCase()}`]
                if (!optText) return null
                return (
                  <MCQOption
                    key={key}
                    keyLabel={key}
                    text={optText}
                    selected={answers[q.id] === key}
                    onClick={() => handleOptionClick(q.id, key)}
                  />
                )
              })}
            </div>

            {/* Error notice */}
            {error && (
              <div style={{
                marginTop: 24,
                padding: '12px 16px',
                background: 'rgba(241,76,76,0.1)',
                border: '1px solid var(--error)',
                borderRadius: 4,
                color: 'var(--error)',
                fontSize: 13,
                fontFamily: 'var(--font-code)',
              }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{
          padding: '24px 40px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '16px'
        }}>
          {/* Previous */}
          <button
            id="mcq-prev-btn"
            onClick={goPrev}
            disabled={isFirst}
            className="btn btn-secondary"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', fontSize: 14,
              opacity: isFirst ? 0.35 : 1,
              cursor: isFirst ? 'not-allowed' : 'pointer',
              borderRadius: 6
            }}
          >
            <ArrowLeft size={16} />
            Previous
          </button>

          {/* Review */}
          <button
            id="mcq-review-btn"
            onClick={handleMarkReview}
            className="btn btn-secondary"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', fontSize: 14,
              color: isMarked ? '#f0883e' : 'var(--text-muted)',
              borderColor: isMarked ? 'rgba(240,136,62,0.6)' : 'var(--border)',
              background: isMarked ? 'rgba(240,136,62,0.12)' : 'transparent',
              borderRadius: 6
            }}
          >
            <Bookmark size={16} />
            {isMarked ? 'Marked' : 'Review'}
          </button>

          {/* Next / Submit Section */}
          {isLast ? (
            testMode ? (
              <button
                id="mcq-submit-btn"
                onClick={handleSubmitMCQ}
                disabled={submitting}
                className="btn btn-primary"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, 
                  padding: '10px 24px', fontSize: 14, 
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #e37d22 0%, #c26111 100%)',
                  border: '1px solid #f29e55',
                  boxShadow: '0 4px 12px rgba(227, 125, 34, 0.3)'
                }}
              >
                <Send size={16} />
                {submitting ? 'Submitting...' : 'Submit & Next (Test Mode)'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => goToQuestion(0)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', fontSize: 14,
                    borderRadius: 6
                  }}
                >
                  <RotateCcw size={15} />
                  Back to Q1
                </button>
                <div
                  title="Section auto-submits when the 40-minute timer expires"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', fontSize: 13, fontWeight: 600,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6, color: '#8b949e',
                    fontFamily: 'var(--font-code)',
                  }}
                >
                  <Clock size={14} color="#8b949e" />
                  <span>Auto-submits when timer ends</span>
                </div>
              </div>
            )
          ) : (
            <button
              id="mcq-next-btn"
              onClick={goNext}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', fontSize: 14, borderRadius: 6 }}
            >
              Next
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
