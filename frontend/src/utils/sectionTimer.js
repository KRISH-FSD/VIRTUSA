/**
 * Section Timer Configuration
 * 
 * Section 1: Programming MCQ  -> 40 minutes (2400s)
 * Section 2: Excel & Data     -> 25 minutes (1500s)
 * Section 3: SQL Assessment   -> 25 minutes (1500s)
 * Section 4: DSA Problem 1    -> 15 minutes (900s)
 * Section 4: DSA Problem 2    -> 25 minutes (1500s)
 */

export const SECTION_DURATIONS = {
  mcq: {
    name: 'Section 1 (MCQ)',
    durationMinutes: 40,
    totalSeconds: 40 * 60,
  },
  excel: {
    name: 'Section 2 (Excel)',
    durationMinutes: 25,
    totalSeconds: 25 * 60,
  },
  sql: {
    name: 'Section 3 (SQL)',
    durationMinutes: 25,
    totalSeconds: 25 * 60,
  },
  coding_p1: {
    name: 'Coding Problem 1',
    durationMinutes: 15,
    totalSeconds: 15 * 60,
  },
  coding_p2: {
    name: 'Coding Problem 2',
    durationMinutes: 25,
    totalSeconds: 25 * 60,
  },
  coding: {
    name: 'Section 4 (Coding)',
    durationMinutes: 40,
    totalSeconds: 40 * 60,
  },
}

function getAttemptId() {
  try {
    const session = JSON.parse(sessionStorage.getItem('attempt'))
    return session?.attemptId || 'default'
  } catch {
    return 'default'
  }
}

/**
 * Get or initialize the timer for a section or problem.
 * Ensures fresh attempts get the full official duration.
 */
export function getOrInitSectionTimer(timerKey) {
  const config = SECTION_DURATIONS[timerKey]
  if (!config) return null

  const attemptId = getAttemptId()
  const storageKey = `codeeval_timer_${attemptId}_${timerKey}`
  const existing = sessionStorage.getItem(storageKey)

  if (existing) {
    try {
      const data = JSON.parse(existing)
      const now = Date.now()
      if (data.endTime && data.endTime > now) {
        return data
      }
    } catch {}
  }

  // Initialize fresh timer for this attempt
  const durationMs = config.durationMinutes * 60 * 1000
  const now = Date.now()
  const timerData = {
    timerKey,
    startTime: now,
    endTime: now + durationMs,
    totalSeconds: config.totalSeconds,
    durationMinutes: config.durationMinutes,
  }

  sessionStorage.setItem(storageKey, JSON.stringify(timerData))
  window.dispatchEvent(new CustomEvent('codeeval_timer_changed', { detail: timerData }))
  return timerData
}

/**
 * Clear all timers for fresh start
 */
export function clearAllSectionTimers() {
  try {
    const keysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && (k.startsWith('codeeval_timer_') || k.startsWith('section_timer_'))) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k))
  } catch {}
}

/**
 * Extend active timer (+15 min) for testing in developer mode
 */
export function extendSectionTimer(timerKey, extraMinutes = 15) {
  const attemptId = getAttemptId()
  const storageKey = `codeeval_timer_${attemptId}_${timerKey}`
  const existing = sessionStorage.getItem(storageKey)

  let baseEnd = Date.now()
  let totalSecs = 25 * 60
  if (existing) {
    try {
      const data = JSON.parse(existing)
      baseEnd = Math.max(Date.now(), data.endTime)
      totalSecs = data.totalSeconds + extraMinutes * 60
    } catch {}
  }

  const updatedEnd = baseEnd + extraMinutes * 60 * 1000
  const updatedData = {
    timerKey,
    startTime: Date.now(),
    endTime: updatedEnd,
    totalSeconds: totalSecs,
  }
  sessionStorage.setItem(storageKey, JSON.stringify(updatedData))
  window.dispatchEvent(new CustomEvent('codeeval_timer_changed', { detail: updatedData }))
}
