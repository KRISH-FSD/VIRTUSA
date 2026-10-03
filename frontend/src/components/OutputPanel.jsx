import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Play, Terminal, Check, Bug } from 'lucide-react'

function formatInputData(inputData) {
  if (!inputData) return ''
  return String(inputData).trim()
}

function RunningLiveStatus({ isSubmitting }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '24px 20px',
      color: 'var(--text-white)',
      fontFamily: 'var(--font-code)',
      fontSize: 12.5,
    }}>
      <div className="spinner" style={{ width: 15, height: 15, borderTopColor: 'var(--accent)' }} />
      <span>{isSubmitting ? 'Submitting solution and running all test cases...' : 'Running solution against test cases...'}</span>
    </div>
  )
}

export default function OutputPanel({
  runResult,
  submitResult,
  isRunning,
  isSubmitting,
  question,
  language = 'python',
  onRun,
  onSubmit,
}) {
  const [panelTab, setPanelTab] = useState('testresult') // 'testcase' | 'testresult'
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0)

  const publicCases = question?.test_cases?.filter(tc => tc.is_public) || []
  const result = submitResult || runResult
  const hasResult = !!result && (result.results?.length > 0)

  // Switch to test result automatically when run completes or question changes
  useEffect(() => {
    setSelectedCaseIdx(0)
    if (result) {
      setPanelTab('testresult')
    }
  }, [result, question?.id])

  const tabBtnStyle = (name) => ({
    padding: '6px 14px',
    fontSize: 12,
    fontFamily: 'var(--font-ui)',
    fontWeight: panelTab === name ? 600 : 500,
    cursor: 'pointer',
    color: panelTab === name ? 'var(--text-white)' : 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    borderBottom: panelTab === name ? '2px solid var(--accent)' : '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 150ms ease',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-panel)', minHeight: 0 }}>
      {/* Console Tab Header + Run / Submit action buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel2)',
        padding: '0 12px 0 6px',
        height: 36,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button style={tabBtnStyle('testcase')} onClick={() => setPanelTab('testcase')}>
            <Terminal size={12} />
            Testcase
          </button>
          <button style={tabBtnStyle('testresult')} onClick={() => setPanelTab('testresult')}>
            <Check size={12} />
            Test Result
            {hasResult && (
              <span style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 8,
                background: result.passed === result.total ? 'rgba(63,185,80,0.2)' : 'rgba(248,81,73,0.2)',
                color: result.passed === result.total ? '#3fb950' : '#f85149',
                fontWeight: 700,
              }}>
                {result.passed}/{result.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Console Body */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* Live Running / Submitting state */}
        {(isRunning || isSubmitting) && (
          <RunningLiveStatus isSubmitting={isSubmitting} language={language} />
        )}

        {/* Tab 1: Testcase inputs view (LeetCode style) */}
        {!isRunning && !isSubmitting && panelTab === 'testcase' && (
          <div style={{ padding: '14px 18px' }} className="fade-in">
            {/* Case selector pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {publicCases.map((tc, idx) => (
                <button
                  key={tc.id || idx}
                  onClick={() => setSelectedCaseIdx(idx)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: 'var(--font-code)',
                    fontWeight: selectedCaseIdx === idx ? 600 : 500,
                    cursor: 'pointer',
                    background: selectedCaseIdx === idx ? '#30363d' : '#21262d',
                    color: selectedCaseIdx === idx ? '#ffffff' : '#8b949e',
                    border: `1px solid ${selectedCaseIdx === idx ? '#58a6ff' : '#30363d'}`,
                    transition: 'all 150ms ease',
                  }}
                >
                  Case {idx + 1}
                </button>
              ))}
            </div>

            {publicCases[selectedCaseIdx] ? (
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  INPUT PARAMETERS
                </div>
                <pre style={{
                  margin: 0,
                  padding: '10px 12px',
                  background: '#0d1117',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontFamily: 'var(--font-code)',
                  fontSize: 12,
                  color: 'var(--text-white)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {formatInputData(publicCases[selectedCaseIdx].input_data, question?.title)}
                </pre>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-code)' }}>
                No public test cases available for this question.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Test Result view (LeetCode style) */}
        {!isRunning && !isSubmitting && panelTab === 'testresult' && (
          <div style={{ padding: '14px 18px' }} className="fade-in">
            {!hasResult ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 0',
                color: 'var(--text-muted)',
                gap: 8,
              }}>
                <Play size={24} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-code)' }}>
                  You must run your code first to view test results.
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Click "Run" or press Ctrl+Enter to test your solution.
                </span>
              </div>
            ) : (
              <div>
                {/* Result Status Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: result.passed === result.total ? '#3fb950' : '#f85149',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    {result.passed === result.total ? (
                      <>
                        <CheckCircle2 size={18} color="#3fb950" />
                        Accepted
                      </>
                    ) : (
                      <>
                        <XCircle size={18} color="#f85149" />
                        Wrong Answer
                      </>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-code)',
                    color: 'var(--text-muted)',
                    marginLeft: 'auto',
                    display: 'flex',
                    gap: 12,
                  }}>
                    <span>
                      Passed: <strong style={{ color: result.passed === result.total ? '#3fb950' : '#f85149' }}>{result.passed}/{result.total}</strong>
                    </span>
                    {result.total_time_ms != null && (
                      <span>Runtime: <strong>{result.total_time_ms} ms</strong></span>
                    )}
                  </div>
                </div>

                {/* Case Selector Pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {result.results.map((r, idx) => (
                    <button
                      key={r.test_case_id || idx}
                      onClick={() => setSelectedCaseIdx(idx)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: 'var(--font-code)',
                        fontWeight: selectedCaseIdx === idx ? 600 : 500,
                        cursor: 'pointer',
                        background: selectedCaseIdx === idx ? '#30363d' : '#21262d',
                        color: selectedCaseIdx === idx ? '#ffffff' : '#8b949e',
                        border: `1px solid ${selectedCaseIdx === idx ? '#58a6ff' : '#30363d'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 150ms ease',
                      }}
                    >
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: r.status === 'PASS' ? '#3fb950' : '#f85149'
                      }} />
                      Case {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Selected Case Details */}
                {result.results[selectedCaseIdx] && (() => {
                  const curr = result.results[selectedCaseIdx]
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Input */}
                      <div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--text-dim)', marginBottom: 4 }}>
                          INPUT
                        </div>
                        <pre style={{ margin: 0, padding: '8px 10px', background: '#0d1117', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-code)', fontSize: 11.5, color: '#e6edf3', whiteSpace: 'pre-wrap' }}>
                          {formatInputData(curr.input_data, question?.title)}
                        </pre>
                      </div>

                      {/* Output */}
                      <div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--text-dim)', marginBottom: 4 }}>
                          OUTPUT
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: '8px 10px',
                          background: '#0d1117',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          fontFamily: 'var(--font-code)',
                          fontSize: 11.5,
                          color: curr.status === 'PASS' ? '#3fb950' : '#f85149',
                          whiteSpace: 'pre-wrap',
                          fontWeight: 600,
                        }}>
                          {curr.actual_output !== '' && curr.actual_output != null ? curr.actual_output : '(empty output)'}
                        </pre>
                      </div>

                      {/* Expected */}
                      <div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--text-dim)', marginBottom: 4 }}>
                          EXPECTED
                        </div>
                        <pre style={{ margin: 0, padding: '8px 10px', background: '#0d1117', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-code)', fontSize: 11.5, color: '#3fb950', whiteSpace: 'pre-wrap', fontWeight: 600 }}>
                          {curr.expected_output}
                        </pre>
                      </div>

                      {/* Error / Traceback if any */}
                      {curr.error_message && (
                        <div>
                          <div style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: '#f85149', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Bug size={11} /> ERROR / RUNTIME MESSAGE
                          </div>
                          <pre style={{ margin: 0, padding: '8px 10px', background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 4, fontFamily: 'var(--font-code)', fontSize: 11, color: '#f85149', whiteSpace: 'pre-wrap' }}>
                            {curr.error_message}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
