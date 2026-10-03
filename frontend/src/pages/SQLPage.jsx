import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Bookmark, Send, Play, Database, Table, CheckCircle2, AlertCircle, RefreshCw, Clock, RotateCcw } from 'lucide-react'
import QuestionNavigator from '../components/QuestionNavigator'
import { getSQLQuestions, runSQLQuery, saveSQLAnswer, completeSQL } from '../services/api'
import { toast } from '../components/ToastProvider'
import { isUserCompleted } from '../utils/authLock'
import { useTestMode } from '../utils/testMode'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('attempt')) } catch { return null }
}

function renderMarkdownTables(md) {
  if (!md) return null;
  const blocks = md.trim().split('\n\n');

  return blocks.map((block, idx) => {
    const lines = block.trim().split('\n');
    let tableStart = -1;
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].includes('|') && lines[i+1].includes('|---')) {
        tableStart = i;
        break;
      }
    }

    if (tableStart !== -1) {
      const preText = lines.slice(0, tableStart).join('\n');
      const parseRow = (line) => {
        const parts = line.split('|').map(s => s.trim());
        if (parts[0] === '') parts.shift();
        if (parts[parts.length - 1] === '') parts.pop();
        return parts;
      };
      
      const headers = parseRow(lines[tableStart]);
      const rows = [];
      let i = tableStart + 2;
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      
      const postText = lines.slice(i).join('\n');

      return (
        <div key={idx} style={{ marginBottom: 16 }}>
          {preText && <div style={{ marginBottom: 8, color: '#c9d1d9', fontWeight: 600 }}>{preText}</div>}
          <div style={{ overflowX: 'auto', borderRadius: 4, border: '1px solid #30363d', marginBottom: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, fontFamily: 'var(--font-ui)', background: '#0d1117' }}>
              <thead>
                <tr>
                  {headers.map((h, j) => (
                    <th key={j} style={{ padding: '8px 12px', background: '#161b22', borderBottom: '1px solid #30363d', borderRight: j < headers.length - 1 ? '1px solid #30363d' : 'none', color: '#e6edf3', fontWeight: 600 }}>
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
          {postText && <div style={{ color: '#c9d1d9' }}>{postText}</div>}
        </div>
      );
    }
    return <div key={idx} style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{block}</div>;
  });
}

export default function SQLPage() {
  const { testMode } = useTestMode()
  const navigate = useNavigate()
  const session = getSession()
  const attemptId = session?.attemptId

  const [questions, setQuestions] = useState([])
  const [queries, setQueries] = useState({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
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

    getSQLQuestions(attemptId).then(data => {
      setQuestions(data.questions)
      if (data.expires_at) {
        const sess = getSession() || {}
        sess.expiresAt = data.expires_at
        sess.currentSection = 'SQL'
        sessionStorage.setItem('attempt', JSON.stringify(sess))
      }

      const saved = {}
      data.questions.forEach(q => { if (q.saved_query) saved[q.id] = q.saved_query })
      setQueries(saved)

      const initialVisited = new Set()
      if (data.questions.length > 0) initialVisited.add(data.questions[0].id)
      data.questions.forEach(q => { if (q.saved_query) initialVisited.add(q.id) })
      setVisited(initialVisited)
      setLoading(false)
    }).catch(err => {
      const msg = err.response?.data?.error || ''
      if (msg.includes('completed')) {
        navigate('/exam/completed', { replace: true })
      } else if (msg.includes('CODING')) {
        navigate('/exam/coding', { replace: true })
      } else {
        toast.error(msg || 'Failed to load SQL questions')
        setLoading(false)
      }
    })
  }, [attemptId, navigate, session?.userId])

  function handleQueryChange(questionId, val) {
    setQueries(prev => ({ ...prev, [questionId]: val }))
    setSavedStatus(prev => ({ ...prev, [questionId]: 'saving' }))

    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId])
    }

    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      try {
        await saveSQLAnswer(attemptId, questionId, val)
        setSavedStatus(prev => ({ ...prev, [questionId]: 'saved' }))
      } catch {
        setSavedStatus(prev => ({ ...prev, [questionId]: 'error' }))
      }
    }, 600)
  }

  async function handleRunQuery() {
    const qId = questions[currentIdx]?.id
    const currentCode = queries[qId] || ''
    if (!currentCode.trim()) {
      toast.warn('Please write a SQL query first.')
      return
    }

    setRunning(true)
    setQueryResult(null)

    try {
      const res = await runSQLQuery(attemptId, qId, currentCode)
      setQueryResult(res)
      if (res.success) {
        toast.success(`Query executed successfully (${res.row_count} row${res.row_count !== 1 ? 's' : ''})`)
      } else {
        toast.error('SQL Execution Error')
      }
    } catch (err) {
      setQueryResult({
        success: false,
        error: err.response?.data?.error || err.message,
        columns: [],
        rows: [],
      })
    } finally {
      setRunning(false)
    }
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
    setQueryResult(null)
  }

  function goPrev() {
    if (currentIdx <= 0) return
    const prev = currentIdx - 1
    markVisited(prev)
    setCurrentIdx(prev)
    setQueryResult(null)
  }

  function goToQuestion(idx) {
    markVisited(idx)
    setCurrentIdx(idx)
    setQueryResult(null)
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
      toast.warn('Time is up for Section 3! Submitting queries and moving to Section 4...')
      handleSubmitSection()
    }
    window.addEventListener('codeeval_section_timeout', onTimeout)
    return () => window.removeEventListener('codeeval_section_timeout', onTimeout)
  }, [attemptId])

  async function handleSubmitSection() {
    setSubmitting(true)

    try {
      const res = await completeSQL(attemptId)
      if (res?.expires_at) {
        const sess = getSession() || {}
        sess.expiresAt = res.expires_at
        sess.currentSection = res.current_section || 'CODING'
        sessionStorage.setItem('attempt', JSON.stringify(sess))
      }
      toast.success('Section 3 Completed! Proceeding to Section 4: DSA Coding Challenge...')
      setTimeout(() => navigate(res?.next_route || '/exam/coding'), 600)
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed'
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
  const currentCode = queries[q?.id] || ''
  const currentSaveStatus = savedStatus[q?.id] || (currentCode ? 'saved' : '')

  return (
    <div className="mcq-layout">
      {/* Left navigator */}
      <QuestionNavigator
        questions={questions}
        currentIndex={currentIdx}
        answers={queries}
        markedForReview={markedForReview}
        visited={visited}
        onNavigate={goToQuestion}
      />

      {/* Right: SQL Work area */}
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
              Section 3: SQL Assessment
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

        {/* Two-column Split: Left Problem & Schema, Right Editor & Output */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr', overflow: 'hidden' }}>

          {/* Left Panel: Problem description & Schema */}
          <div style={{
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            padding: '40px',
            overflowY: 'auto',
          }}>
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

            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-white)', marginBottom: 16, fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em' }}>
              {q.title}
            </div>

            <div style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: '#c9d1d9',
              marginBottom: 32,
            }}>
              {q.description}
            </div>

            {/* Database Schema Viewer */}
            <div style={{
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 24,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                padding: '12px 16px',
                background: '#161b22',
                borderBottom: '1px solid #30363d',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontFamily: 'var(--font-code)',
                fontWeight: 600,
                color: '#58a6ff',
              }}>
                <Database size={15} /> Schema Definition & Tables
              </div>
              <div style={{
                padding: '16px 20px',
                fontFamily: 'var(--font-code)',
                fontSize: 14,
                lineHeight: 1.6,
                color: '#8b949e',
                overflowX: 'auto',
              }}>
                {q.schema_ddl && (
                  <div style={{ marginBottom: 20, whiteSpace: 'pre-wrap', color: '#58a6ff' }}>
                    {q.schema_ddl.trim()}
                  </div>
                )}
                {renderMarkdownTables(q.table_preview)}
              </div>
            </div>
          </div>

          {/* Right Panel: SQL Editor & Output */}
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-editor)', overflow: 'hidden' }}>

            {/* Editor Top Bar with Run Button */}
            <div style={{
              padding: '14px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-panel2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SQL Query Editor
              </span>

              <button
                onClick={handleRunQuery}
                disabled={running}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 18px',
                  fontSize: 13,
                  background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
                  border: '1px solid #3fb950',
                  borderRadius: 6,
                  boxShadow: '0 2px 8px rgba(46, 160, 67, 0.35)',
                }}
              >
                {running ? <RefreshCw size={14} className="spin" /> : <Play size={14} fill="#ffffff" />}
                {running ? 'Running...' : 'Run Query'}
              </button>
            </div>

            {/* SQL Textarea */}
            <div style={{ flex: '0 0 280px', borderBottom: '1px solid var(--border)', background: '#0d1117' }}>
              <textarea
                value={currentCode}
                onChange={e => handleQueryChange(q.id, e.target.value)}
                placeholder="-- Write your SQL query here (e.g. SELECT ... FROM ...)"
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '24px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#79c0ff',
                  fontFamily: 'var(--font-code)',
                  fontSize: 15,
                  lineHeight: 1.6,
                  resize: 'none',
                }}
              />
            </div>

            {/* Query Results / Output Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#0d1117' }}>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-code)', color: '#8b949e', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Query Results
              </div>

              {!queryResult && (
                <div style={{ color: 'var(--text-dim)', fontSize: 14, fontFamily: 'var(--font-code)', fontStyle: 'italic', marginTop: 12 }}>
                  Click "Run Query" to execute against the test database and preview output rows.
                </div>
              )}

              {queryResult && !queryResult.success && (
                <div style={{
                  padding: '16px 20px',
                  background: 'rgba(241,76,76,0.1)',
                  border: '1px solid var(--error)',
                  borderRadius: 6,
                  color: 'var(--error)',
                  fontSize: 14,
                  fontFamily: 'var(--font-code)',
                  marginTop: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                    <AlertCircle size={16} /> Execution Error:
                  </div>
                  <div>{queryResult.error}</div>
                </div>
              )}

              {queryResult && queryResult.success && (
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  {queryResult.rows.length === 0 ? (
                    <div style={{ color: '#8b949e', fontSize: 14, fontFamily: 'var(--font-code)' }}>
                      Query executed successfully with 0 rows returned.
                    </div>
                  ) : (
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 14,
                      fontFamily: 'var(--font-code)',
                      color: '#e6edf3',
                    }}>
                      <thead>
                        <tr style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}>
                          {queryResult.columns.map((col, ci) => (
                            <th key={ci} style={{ padding: '10px 16px', textAlign: 'left', color: '#58a6ff', fontWeight: 600 }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, ri) => (
                          <tr key={ri} style={{ borderBottom: '1px solid #21262d', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding: '10px 16px' }}>
                                {cell === null ? <span style={{ color: '#8b949e', fontStyle: 'italic' }}>NULL</span> : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
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
                onClick={handleSubmitSection}
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
                  title="Section auto-submits when the 25-minute timer expires"
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
