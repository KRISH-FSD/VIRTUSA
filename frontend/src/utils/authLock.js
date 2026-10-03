// Cookie and storage helpers to enforce permanent one-time exam completion

export function setCookie(name, value, days = 365) {
  const maxAge = days * 24 * 60 * 60
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAge};expires=${date.toUTCString()};path=/;SameSite=Lax`
}

export function getCookie(name) {
  const nameEQ = `${name}=`
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length))
  }
  return null
}

export function markExamCompleted(userId, attemptId) {
  const cleanId = userId ? String(userId).trim().toUpperCase() : 'CANDIDATE'

  // Set persistent cookies with root path
  setCookie(`codeeval_completed_${cleanId}`, '1', 365)
  setCookie('codeeval_last_completed_user', cleanId, 365)
  setCookie('codeeval_exam_locked', '1', 365)

  // LocalStorage persistence for redundancy
  try {
    const list = JSON.parse(localStorage.getItem('codeeval_completed_users') || '[]')
    if (!list.includes(cleanId)) {
      list.push(cleanId)
      localStorage.setItem('codeeval_completed_users', JSON.stringify(list))
    }
    localStorage.setItem('codeeval_last_completed_user', cleanId)
    localStorage.setItem('codeeval_exam_locked', 'true')
    if (attemptId) {
      localStorage.setItem(`codeeval_attempt_${cleanId}`, String(attemptId))
    }
  } catch (e) {
    console.error('Storage error', e)
  }
}

export function isUserCompleted(userId) {
  /* === TEMPORARILY DISABLED: User will say "UNCOMMENT" at final stage ===
  if (!userId) return false
  const cleanId = String(userId).trim().toUpperCase()

  if (getCookie(`codeeval_completed_${cleanId}`) === '1') {
    return true
  }

  try {
    const list = JSON.parse(localStorage.getItem('codeeval_completed_users') || '[]')
    if (list.includes(cleanId)) {
      return true
    }
  } catch {}
  ======================================================================== */
  return false
}

export function isExamLocked() {
  /* === TEMPORARILY DISABLED: User will say "UNCOMMENT" at final stage ===
  if (getCookie('codeeval_exam_locked') === '1') {
    return true
  }
  if (getCookie('codeeval_last_completed_user')) {
    return true
  }
  if (typeof document !== 'undefined' && document.cookie.includes('codeeval_completed_')) {
    return true
  }

  try {
    if (localStorage.getItem('codeeval_exam_locked') === 'true') {
      return true
    }
    if (localStorage.getItem('codeeval_last_completed_user')) {
      return true
    }
    const list = JSON.parse(localStorage.getItem('codeeval_completed_users') || '[]')
    if (list && list.length > 0) {
      return true
    }
  } catch {}
  ======================================================================== */
  return false
}

export function getLastCompletedUser() {
  const fromCookie = getCookie('codeeval_last_completed_user')
  if (fromCookie) return fromCookie

  try {
    const fromStorage = localStorage.getItem('codeeval_last_completed_user')
    if (fromStorage) return fromStorage

    const list = JSON.parse(localStorage.getItem('codeeval_completed_users') || '[]')
    if (list && list.length > 0) return list[list.length - 1]
  } catch {}

  return null
}
