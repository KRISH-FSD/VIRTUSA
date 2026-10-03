import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Send, FileCode, AlertCircle, Code2, ChevronDown, Check, Sparkles, Lock } from 'lucide-react'
import CodeEditor from '../components/CodeEditor'
import OutputPanel from '../components/OutputPanel'
import ResizableSplit from '../components/ResizableSplit'
import { getCodingProblems, runCode, submitCode, startExam } from '../services/api'
import { toast } from '../components/ToastProvider'
import { markExamCompleted, isUserCompleted } from '../utils/authLock'
import { getTestMode, useTestMode } from '../utils/testMode'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('attempt')) } catch { return null }
}

const SUPPORTED_LANGUAGES = [
  { id: 'python',     name: 'Python 3',   ext: 'py',   file: 'solution.py',   monaco: 'python'     },
  { id: 'javascript', name: 'JavaScript', ext: 'js',   file: 'solution.js',   monaco: 'javascript' },
  { id: 'c',          name: 'C',          ext: 'c',    file: 'solution.c',    monaco: 'c'          },
  { id: 'cpp',        name: 'C++',        ext: 'cpp',  file: 'solution.cpp',  monaco: 'cpp'        },
  { id: 'java',       name: 'Java',       ext: 'java', file: 'Solution.java', monaco: 'java'       },
]

const LEETCODE_TEMPLATES = {
  python: { 1: '', 2: '' },
  javascript: { 1: '', 2: '' },
  c: { 1: '', 2: '' },
  cpp: { 1: '', 2: '' },
  java: { 1: '', 2: '' },
}

// ── Vertical Resizable Split ──────────────────────────────────────
function VerticalResizableSplit({ top, bottom, defaultTop = 58 }) {
  const [topPercent, setTopPercent] = useState(defaultTop)
  const isDragging = useRef(false)
  const containerRef = useRef(null)

  const onMouseDown = (e) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newPercent = ((e.clientY - rect.top) / rect.height) * 100
      setTopPercent(Math.min(85, Math.max(20, newPercent)))
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ height: `${topPercent}%`, overflow: 'hidden', minHeight: 0 }}>
        {top}
      </div>
      <div
        onMouseDown={onMouseDown}
        style={{
          height: 6,
          cursor: 'row-resize',
          background: 'var(--border)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
          transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--border)'}
      />
      <div style={{ height: `${100 - topPercent}%`, overflow: 'hidden', minHeight: 0 }}>
        {bottom}
      </div>
    </div>
  )
}

// ── Problem Panel ─────────────────────────────────────────────────
function ProblemPanel({ question, questionIdx = 0 }) {
  const [activeTab, setActiveTab] = useState('description')

  if (!question) return null
  const publicCases = question.test_cases?.filter(tc => tc.is_public) || []

  const tabStyle = (name) => ({
    padding: '6px 14px',
    fontSize: 12,
    fontFamily: 'var(--font-ui)',
    fontWeight: activeTab === name ? 600 : 500,
    cursor: 'pointer',
    color: activeTab === name ? 'var(--text-white)' : 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    borderBottom: activeTab === name ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'color 150ms, border-color 150ms',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-panel)', borderRight: '1px solid var(--border)' }}>
      {/* Problem header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-white)' }}>
          {questionIdx + 1}. {question.title}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-panel2)' }}>
        <button style={tabStyle('description')} onClick={() => setActiveTab('description')}>
          Description
        </button>
        <button style={tabStyle('examples')} onClick={() => setActiveTab('examples')}>
          Examples ({publicCases.length})
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {activeTab === 'description' && (
          <div className="fade-in">
            <div style={{ fontSize: 13, color: 'var(--text-normal)', lineHeight: 1.75, marginBottom: 18, whiteSpace: 'pre-line' }}>
              {question.description}
            </div>

            {question.input_format && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Input Format
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-normal)', lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 4 }}>
                  {question.input_format}
                </div>
              </>
            )}

            {question.output_format && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Output Format
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-normal)', lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 4 }}>
                  {question.output_format}
                </div>
              </>
            )}

            {question.constraints && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Constraints
                </div>
                <div style={{ fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--warning)', marginBottom: 16, background: 'rgba(220, 220, 170, 0.05)', padding: '8px 12px', borderRadius: 4 }}>
                  {question.constraints}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="fade-in">
            {publicCases.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No public examples.</div>
            )}
            {publicCases.map((tc, idx) => (
              <div key={tc.id || idx} style={{ marginBottom: 16, background: 'var(--bg-panel2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', background: '#252526', borderBottom: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Example {idx + 1}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--text-dim)', marginBottom: 4 }}>INPUT</div>
                  <pre style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text-white)', background: '#0d1117', padding: '6px 8px', borderRadius: 4 }}>{tc.input_data}</pre>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--text-dim)', marginBottom: 4 }}>EXPECTED OUTPUT</div>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--success)', background: '#0d1117', padding: '6px 8px', borderRadius: 4 }}>{tc.expected_output}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Coding Page ──────────────────────────────────────────────
export default function CodingPage() {
  const { testMode } = useTestMode()
  const navigate = useNavigate()
  const session = getSession()
  const attemptId = session?.attemptId

  const [questions, setQuestions] = useState([])
  const [currentProblemIdx, setCurrentProblemIdx] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [codes, setCodes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runResults, setRunResults] = useState({})
  const [submitResults, setSubmitResults] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // 1. Final submission handler
  const proceedSubmit = useCallback(async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)
    setError('')
    toast.info('Evaluating all test cases and finalizing assessment...', 6000)

    try {
      // Build final submissions dictionary
      const finalSubmissions = {}
      questions.forEach((q) => {
        const langKey = `${q.id}_${selectedLanguage}`
        finalSubmissions[q.id] = codes[langKey] || codes[q.id] || LEETCODE_TEMPLATES[selectedLanguage]?.[q.id] || q.starter_code || ''
      })

      const result = await submitCode(attemptId, finalSubmissions, selectedLanguage)
      setSubmitted(true)
      markExamCompleted(session?.userId, attemptId)
      sessionStorage.setItem('result', JSON.stringify(result))

      toast.success('Assessment Successfully Completed!')
      window.__ALLOW_NAVIGATE__ = true
      setTimeout(() => navigate('/exam/completed', { replace: true }), 1500)
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed'
      setError(msg)
      toast.error(msg)
      setIsSubmitting(false)
    }
  }, [attemptId, codes, navigate, questions, selectedLanguage, session?.userId])

  // 2. Problem switch handler with Timer Guard
  const switchProblem = useCallback((idx) => {
    if (!testMode) {
      if (currentProblemIdx === 0 && idx === 1) {
        toast.info('Problem 2 is locked. It will automatically unlock when Problem 1 timer expires (15 mins).')
        return
      }
      if (currentProblemIdx === 1 && idx === 0) {
        toast.info('Problem 1 time has ended. Please focus on Problem 2.')
        return
      }
    }
    setCurrentProblemIdx(idx)
    window.dispatchEvent(new CustomEvent('codeeval_active_problem_changed', { detail: { problemIdx: idx } }))
  }, [testMode, currentProblemIdx])

  // 3. Confirm modal opener
  const handleSubmit = useCallback(() => {
    setShowConfirmModal(true)
  }, [])

  // 4. Auto-submit on section/problem timer expiry
  useEffect(() => {
    const onTimeout = (e) => {
      const expiredKey = e.detail?.timerKey
      if (expiredKey === 'coding_p1') {
        toast.warn('Time is up for Problem 1 (15 mins)! Auto-switching to Problem 2...')
        switchProblem(1)
      } else {
        toast.warn('Time is up! Auto-submitting final assessment...')
        proceedSubmit()
      }
    }
    window.addEventListener('codeeval_section_timeout', onTimeout)
    return () => window.removeEventListener('codeeval_section_timeout', onTimeout)
  }, [proceedSubmit, switchProblem])

  // Initial data load
  useEffect(() => {
    if (!attemptId) {
      if (getTestMode()) {
        startExam('DEV-TESTER').then(res => {
          const sess = { attemptId: res.attempt_id, userId: 'DEV-TESTER', currentSection: 'CODING' }
          sessionStorage.setItem('attempt', JSON.stringify(sess))
          window.location.reload()
        }).catch(() => {
          navigate('/', { replace: true })
        })
        return
      }
      navigate('/', { replace: true })
      return
    }

    if (session?.userId && isUserCompleted(session.userId)) {
      navigate('/exam/completed', { replace: true })
      return
    }

    getCodingProblems(attemptId).then(data => {
      const qs = data.questions || []
      setQuestions(qs)
      if (data.expires_at) {
        const sess = getSession() || {}
        sess.expiresAt = data.expires_at
        sess.currentSection = 'CODING'
        sessionStorage.setItem('attempt', JSON.stringify(sess))
      }

      // Initialize default templates per question
      const initialCodes = {}
      qs.forEach(q => {
        initialCodes[`${q.id}_python`] = LEETCODE_TEMPLATES['python']?.[q.id] || q.starter_code || ''
      })
      setCodes(initialCodes)
      setLoading(false)
    }).catch(err => {
      const msg = err.response?.data?.error || ''
      if (getTestMode()) {
        setError(msg || 'Failed to load coding challenge')
        setLoading(false)
        return
      }
      if (msg.includes('completed')) navigate('/exam/completed', { replace: true })
      else if (msg.includes('MCQ')) navigate('/exam/mcq', { replace: true })
      else if (msg.includes('EXCEL')) navigate('/exam/excel', { replace: true })
      else if (msg.includes('SQL')) navigate('/exam/sql', { replace: true })
      else { setError(msg || 'Failed to load coding challenge'); setLoading(false) }
    })
  }, [attemptId, navigate, session?.userId])

  const activeQuestion = questions[currentProblemIdx]
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage) || SUPPORTED_LANGUAGES[0]
  const currentCodeKey = activeQuestion ? `${activeQuestion.id}_${selectedLanguage}` : ''
  const currentCode = activeQuestion ? (codes[currentCodeKey] ?? LEETCODE_TEMPLATES[selectedLanguage]?.[activeQuestion.id] ?? '') : ''

  const activeQId = activeQuestion?.id
  const activeRunResult = activeQId ? runResults[activeQId] : null
  const activeSubmitResult = activeQId ? submitResults[activeQId] : null

  const handleCodeChange = (newVal) => {
    if (!activeQuestion) return
    setCodes(prev => ({ ...prev, [currentCodeKey]: newVal }))
  }

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang)
    if (activeQuestion) {
      const targetKey = `${activeQuestion.id}_${newLang}`
      if (!codes[targetKey]) {
        const template = LEETCODE_TEMPLATES[newLang]?.[activeQuestion.id] || ''
        setCodes(prev => ({ ...prev, [targetKey]: template }))
      }
    }
  }

  const handleRun = useCallback(async () => {
    if (!activeQuestion || !currentCode.trim() || isRunning || isSubmitting || submitted) return
    const qid = activeQuestion.id
    setIsRunning(true)
    setError('')
    setRunResults(prev => ({ ...prev, [qid]: null }))
    setSubmitResults(prev => ({ ...prev, [qid]: null }))

    try {
      const result = await runCode(attemptId, qid, currentCode, selectedLanguage)
      setRunResults(prev => ({ ...prev, [qid]: result }))

      if (result.passed === result.total) {
        toast.success(`All ${result.total} public tests passed ✓`)
      } else {
        toast.warn(`${result.passed}/${result.total} public tests passed`)
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Run failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsRunning(false)
    }
  }, [attemptId, activeQuestion, currentCode, isRunning, isSubmitting, selectedLanguage, submitted])

  const handleSubmitCode = useCallback(async () => {
    if (!activeQuestion || !currentCode.trim() || isRunning || isSubmitting || submitted) return
    const qid = activeQuestion.id
    setIsSubmitting(true)
    setError('')
    setRunResults(prev => ({ ...prev, [qid]: null }))
    setSubmitResults(prev => ({ ...prev, [qid]: null }))

    try {
      const result = await runCode(attemptId, qid, currentCode, selectedLanguage)
      setSubmitResults(prev => ({ ...prev, [qid]: result }))

      if (result.passed === result.total) {
        toast.success(`Accepted: All ${result.passed}/${result.total} test cases passed ✓`)
        if (currentProblemIdx < questions.length - 1) {
          setTimeout(() => switchProblem(currentProblemIdx + 1), 1000)
        }
      } else {
        toast.warn(`Passed ${result.passed}/${result.total} test cases`)
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Evaluation failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }, [attemptId, activeQuestion, currentCode, isRunning, isSubmitting, selectedLanguage, submitted, currentProblemIdx, questions.length, switchProblem])

  // Listen to TopBar Submit Assessment trigger
  useEffect(() => {
    const onTriggerSubmit = () => {
      setShowConfirmModal(true)
    }
    window.addEventListener('codeeval_trigger_submit_assessment', onTriggerSubmit)
    return () => window.removeEventListener('codeeval_trigger_submit_assessment', onTriggerSubmit)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error && !questions.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--error)', fontFamily: 'var(--font-code)', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="fade-in">

      {/* Top Header & Breadcrumb */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 42,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            Technical Assessment
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 13, margin: '0 2px' }}>›</span>
          <span style={{ fontSize: 12, color: 'var(--text-white)', fontWeight: 600 }}>
            Section 4: DSA Coding Assessment
          </span>
        </div>

        {/* Problem selector tabs (e.g. Problem 1, Problem 2) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {questions.map((q, idx) => {
            const isLocked = !testMode && (
              (currentProblemIdx === 0 && idx === 1) ||
              (currentProblemIdx === 1 && idx === 0)
            )
            return (
              <button
                key={q.id}
                onClick={() => switchProblem(idx)}
                title={isLocked ? (idx === 1 ? 'Unlocks when Problem 1 timer expires (15m)' : 'Problem 1 time ended') : `Problem ${idx + 1}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'var(--font-code)',
                  fontWeight: currentProblemIdx === idx ? 700 : 500,
                  color: currentProblemIdx === idx ? '#ffffff' : isLocked ? '#6e7681' : '#8b949e',
                  background: currentProblemIdx === idx ? 'var(--accent)' : '#21262d',
                  border: `1px solid ${currentProblemIdx === idx ? 'var(--accent)' : '#30363d'}`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.65 : 1,
                  transition: 'all 150ms ease',
                }}
              >
                {isLocked ? <Lock size={11} color="#8b949e" /> : <Code2 size={12} />}
                Problem {idx + 1}
                {isLocked && idx === 1 && <span style={{ fontSize: 9.5, opacity: 0.8 }}>(15m timer)</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main split: Problem | Editor+Output */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <ResizableSplit
          left={<ProblemPanel question={activeQuestion} questionIdx={currentProblemIdx} />}
          right={
            <VerticalResizableSplit
              top={
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Editor Top Bar with Language Picker */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border)',
                    background: '#161b22',
                    padding: '0 12px',
                    height: 38,
                    flexShrink: 0,
                  }}>
                    {/* Left: Language Picker & File name tab */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* LeetCode Style Language Dropdown */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          style={{
                            background: '#21262d',
                            color: '#e6edf3',
                            border: '1px solid #30363d',
                            borderRadius: 4,
                            padding: '3px 22px 3px 8px',
                            fontFamily: 'var(--font-ui)',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                          }}
                        >
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.id} value={lang.id} style={{ background: '#161b22', color: '#e6edf3' }}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={11} color="#8b949e" style={{ position: 'absolute', right: 6, pointerEvents: 'none' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b949e', fontSize: 11, fontFamily: 'var(--font-code)' }}>
                        <FileCode size={12} color="#58a6ff" />
                        <span>{currentLangObj.file}</span>
                        {submitted && (
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>[read-only]</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Monaco Code Editor */}
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <CodeEditor
                      value={currentCode}
                      onChange={handleCodeChange}
                      readOnly={submitted}
                      onRun={handleRun}
                      onSubmit={handleSubmitCode}
                      language={currentLangObj.monaco}
                    />
                  </div>
                </div>
              }
              bottom={
                <OutputPanel
                  runResult={activeRunResult}
                  submitResult={activeSubmitResult}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                  question={activeQuestion}
                  language={currentLangObj.name}
                  onRun={handleRun}
                  onSubmit={handleSubmitCode}
                />
              }
              defaultTop={58}
            />
          }
          defaultLeft={45}
        />
      </div>

      {/* Action Footer Bar with Run Code & Submit Code */}
      <div style={{
        height: 48,
        background: '#161b22',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 11.5, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Problem {currentProblemIdx + 1} of {questions.length}: <strong style={{ color: '#ffffff' }}>{activeQuestion?.title}</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>·</span>
          <span>Language: <strong style={{ color: '#58a6ff' }}>{currentLangObj.name}</strong></span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting || submitted}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              fontSize: 12,
              fontFamily: 'var(--font-code)',
              fontWeight: 600,
              background: '#21262d',
              border: '1px solid #30363d',
              borderRadius: 6,
              cursor: 'pointer',
            }}
            title="Run public test cases (Ctrl+Enter)"
          >
            <Play size={12} fill="currentColor" />
            {isRunning ? 'Running...' : 'Run Test Cases'}
          </button>

          <button
            onClick={handleSubmitCode}
            disabled={isSubmitting || submitted || isRunning}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 18px',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)',
              border: '1px solid #58a6ff',
              borderRadius: 6,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(56, 139, 253, 0.35)',
              cursor: 'pointer',
            }}
            title="Submit code for this problem"
          >
            <Send size={12} />
            {isSubmitting ? 'Evaluating...' : 'Submit Code'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(4px)',
        }}>
          <div className="fade-in" style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 8,
            padding: '24px 28px',
            maxWidth: 460,
            width: '90%',
            boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(240,136,62,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} color="#f0883e" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
                Final Assessment Submission
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6, marginBottom: 20 }}>
              Are you sure you want to submit your final assessment? This will evaluate all 4 sections (MCQ, Excel, SQL, and DSA Coding) and permanently lock your test session.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                onClick={proceedSubmit}
                className="btn btn-primary"
                style={{ padding: '6px 18px', fontSize: 12, background: 'var(--accent)' }}
              >
                Yes, Submit Final Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
