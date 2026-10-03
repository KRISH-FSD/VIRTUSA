import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminGetAttempt } from '../services/api'
import CodeEditor from '../components/CodeEditor'
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'

function StatusIcon({ status }) {
  const props = { size: 13 }
  if (status === 'PASS')  return <CheckCircle  {...props} color="var(--success)" />
  if (status === 'FAIL')  return <XCircle      {...props} color="var(--error)"   />
  if (status === 'TLE')   return <Clock        {...props} color="var(--warning)"  />
  return <AlertTriangle {...props} color="var(--error)" />
}

function MCQReview({ answers }) {
  return (
    <div>
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel2)' }}>
        <span className="section-label">MCQ Answers</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Q#</th>
            <th>Question</th>
            <th>Correct</th>
            <th>Selected</th>
            <th>Result</th>
            <th>Marks</th>
          </tr>
        </thead>
        <tbody>
          {answers.map((a, i) => (
            <tr key={a.question_id}>
              <td style={{ fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>Q{i+1}</td>
              <td style={{ maxWidth: 280, color: 'var(--text-normal)' }}>
                <div>{a.question_text}</div>
                {a.code_snippet && (
                  <div style={{ marginTop: 6, marginBottom: 2 }}>
                    <Highlight 
                      theme={themes.vsDark} 
                      code={a.code_snippet} 
                      language={a.question_text.toLowerCase().includes('python') ? 'python' : (a.question_text.toLowerCase().includes(' c ') || a.question_text.toLowerCase().includes(' c?')) ? 'c' : 'javascript'}
                    >
                      {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <pre style={{
                          ...style,
                          background: '#0d1117',
                          border: '1px solid var(--border)',
                          borderLeft: '2px solid var(--accent)',
                          borderRadius: 4,
                          padding: '6px 8px',
                          fontFamily: 'var(--font-code)',
                          fontSize: 11,
                          lineHeight: 1.4,
                          overflowX: 'auto',
                          margin: 0
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
              </td>
              <td style={{ fontFamily: 'var(--font-code)', color: 'var(--success)', fontWeight: 600 }}>{a.correct_answer}</td>
              <td style={{ fontFamily: 'var(--font-code)', color: a.is_correct ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                {a.selected_answer}
              </td>
              <td>
                {a.is_correct
                  ? <span className="badge badge-pass">CORRECT</span>
                  : <span className="badge badge-fail">WRONG</span>
                }
              </td>
              <td style={{ fontFamily: 'var(--font-code)', color: a.is_correct ? 'var(--success)' : 'var(--text-muted)' }}>
                {a.is_correct ? `+${a.marks}` : '0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodingReview({ coding }) {
  return (
    <div>
      {/* Coding Header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel2)' }}>
        <span className="section-label">Coding Submission</span>
        <span style={{ marginLeft: 12, fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)' }}>
          {coding.question_title}
        </span>
        <span style={{ marginLeft: 'auto', float: 'right', fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--success)' }}>
          {coding.score}/{coding.total_tests * 2} marks · {coding.passed_tests}/{coding.total_tests} tests
        </span>
      </div>

      {/* Test results table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Type</th>
            <th>Status</th>
            <th>Time</th>
            <th>Input</th>
            <th>Expected</th>
            <th>Actual</th>
          </tr>
        </thead>
        <tbody>
          {coding.test_results.map((tr, i) => (
            <tr key={tr.test_case_id}>
              <td style={{ fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>
                {String(i + 1).padStart(2, '0')}
              </td>
              <td>
                {tr.is_public
                  ? <span className="badge badge-pass">PUBLIC</span>
                  : <span className="badge badge-hidden">HIDDEN</span>
                }
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <StatusIcon status={tr.status} />
                  <span style={{ fontFamily: 'var(--font-code)', fontSize: 11 }}>{tr.status}</span>
                </div>
              </td>
              <td style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)' }}>
                {tr.execution_time_ms != null ? `${tr.execution_time_ms}ms` : '—'}
              </td>
              <td>
                <pre style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {tr.input_data}
                </pre>
              </td>
              <td>
                <pre style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--success)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {tr.expected_output}
                </pre>
              </td>
              <td>
                <pre style={{
                  fontFamily: 'var(--font-code)', fontSize: 10,
                  color: tr.status === 'PASS' ? 'var(--success)' : 'var(--error)',
                  whiteSpace: 'pre-wrap', margin: 0,
                }}>
                  {tr.actual_output || tr.error_message || '(empty)'}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Source Code */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel2)' }}>
        <span className="section-label">Submitted Code</span>
        <span style={{ marginLeft: 8, fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--text-muted)' }}>
          main.py — {coding.language}
        </span>
      </div>
      <div style={{ height: 300, borderBottom: '1px solid var(--border)' }}>
        <CodeEditor value={coding.source_code} readOnly={true} />
      </div>
    </div>
  )
}

export default function AdminReview() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminGetAttempt(attemptId).then(d => {
      setData(d)
      setLoading(false)
    }).catch(() => {
      setError('Failed to load attempt')
      setLoading(false)
    })
  }, [attemptId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div style={{ padding: 20, color: 'var(--error)', fontFamily: 'var(--font-code)' }}>{error}</div>
  )

  const { attempt, mcq_answers, coding } = data

  function fmt(d) {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg-editor)' }}>
      {/* Page header */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel2)', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ padding: '3px 10px' }}>
          <ArrowLeft size={12} /> Back
        </button>
        <span style={{ fontFamily: 'var(--font-code)', fontSize: 13, fontWeight: 600, color: 'var(--text-white)' }}>
          {attempt.user_id}
        </span>
        <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)' }}>
          Attempt #{attempt.id}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)' }}>
          {attempt.total_score != null ? `${attempt.total_score}/13` : '—'} total
        </span>
        <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)' }}>
          Completed: {fmt(attempt.completed_at)}
        </span>
      </div>

      {/* Attempt summary */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {[
          ['User ID', attempt.user_id, 'var(--font-code)'],
          ['MCQ Score', attempt.mcq_score != null ? `${attempt.mcq_score}/3` : '—', 'var(--font-code)'],
          ['Coding Score', attempt.coding_score != null ? `${attempt.coding_score}/10` : '—', 'var(--font-code)'],
          ['Total', attempt.total_score != null ? `${attempt.total_score}/13` : '—', 'var(--font-code)'],
          ['Status', attempt.status, null],
          ['Started', fmt(attempt.started_at), null],
        ].map(([label, val, ff]) => (
          <div key={label} style={{ padding: '10px 20px', borderRight: '1px solid var(--border)', flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: ff || 'var(--font-ui)', fontSize: 13, color: 'var(--text-white)' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* MCQ Section */}
      {mcq_answers?.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <MCQReview answers={mcq_answers} />
        </div>
      )}

      {/* Coding Section */}
      {coding && (
        <div>
          <CodingReview coding={coding} />
        </div>
      )}
    </div>
  )
}
