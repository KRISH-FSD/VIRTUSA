import { completeMCQ, submitCode } from '../services/api'
import { markExamCompleted } from './authLock'
import { getTestMode } from './testMode'

const REFRESH_FLAG_KEY = 'codeeval_refresh_pending'
const MAX_AGE_MS = 15_000 // Only treat flags younger than 15s as a real refresh

/**
 * Call this once on app startup.
 * If a refresh was detected (flag written by beforeunload), auto-submit the
 * exam and redirect to /exam/completed with a ✓ (normal submit) style.
 */
export async function handlePendingRefresh() {
  if (getTestMode()) {
    try { localStorage.removeItem(REFRESH_FLAG_KEY) } catch {}
    return false
  }

  let raw
  try {
    raw = localStorage.getItem(REFRESH_FLAG_KEY)
  } catch {
    return false
  }

  if (!raw) return false

  let flag
  try {
    flag = JSON.parse(raw)
  } catch {
    localStorage.removeItem(REFRESH_FLAG_KEY)
    return false
  }

  // Clear flag immediately so we don't re-run on subsequent loads
  localStorage.removeItem(REFRESH_FLAG_KEY)

  const age = Date.now() - (flag.ts || 0)
  if (age > MAX_AGE_MS) return false // Stale flag — ignore

  const { attemptId, userId, path } = flag
  if (!attemptId) return false

  // Mark as submitted (normal completed, NOT auto-submitted by violation)
  sessionStorage.setItem('codeeval_auto_submitted', 'false')
  sessionStorage.setItem('attempt', JSON.stringify({ attemptId, userId }))

  if (userId) {
    markExamCompleted(userId, attemptId)
  }

  // Call backend to finalize the exam
  try {
    if (path && path.includes('/mcq')) {
      await completeMCQ(attemptId)
    } else if (path && path.includes('/coding')) {
      await submitCode(attemptId, '# Submitted via page refresh')
    } else {
      // Try MCQ first, then coding as fallback
      try { await completeMCQ(attemptId) } catch {
        try { await submitCode(attemptId, '# Submitted via page refresh') } catch {}
      }
    }
  } catch {
    // Even if the API call fails, mark completed locally
  }

  return true // Signal that a redirect to /exam/completed should happen
}
