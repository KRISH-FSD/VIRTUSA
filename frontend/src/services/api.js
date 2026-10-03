import axios from 'axios'
import { getTestMode } from '../utils/testMode'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  if (getTestMode()) {
    config.headers['X-Test-Mode'] = 'true'
  }
  return config
})

// ── Environment & Security ─────────────────────────────────────────
export const checkSystemEnvironment = () =>
  api.get('/exam/check-environment').then(r => r.data)

export const closeDisallowedApps = () =>
  api.post('/exam/close-apps').then(r => r.data)

// ── Exam Flow ──────────────────────────────────────────────────────
export const startExam = (userId) =>
  api.post('/exam/start', { user_id: userId }).then(r => r.data)

// ── Section 1: MCQ ─────────────────────────────────────────────────
export const getMCQs = (attemptId) =>
  api.get(`/exam/${attemptId}/mcqs`).then(r => r.data)

export const saveMCQAnswer = (attemptId, questionId, answer) =>
  api.post(`/exam/${attemptId}/mcq-answer`, { question_id: questionId, answer }).then(r => r.data)

export const completeMCQ = (attemptId) =>
  api.post(`/exam/${attemptId}/mcq/complete`).then(r => r.data)

// ── Section 2: Excel & Data Analysis ───────────────────────────────
export const getExcelQuestions = (attemptId) =>
  api.get(`/exam/${attemptId}/excel`).then(r => r.data)

export const saveExcelAnswer = (attemptId, questionId, answer) =>
  api.post(`/exam/${attemptId}/excel-answer`, { question_id: questionId, answer }).then(r => r.data)

export const completeExcel = (attemptId) =>
  api.post(`/exam/${attemptId}/excel/complete`).then(r => r.data)

// ── Section 3: SQL Assessment ──────────────────────────────────────
export const getSQLQuestions = (attemptId) =>
  api.get(`/exam/${attemptId}/sql`).then(r => r.data)

export const runSQLQuery = (attemptId, questionId, query) =>
  api.post(`/exam/${attemptId}/sql/run`, { question_id: questionId, query }).then(r => r.data)

export const saveSQLAnswer = (attemptId, questionId, query) =>
  api.post(`/exam/${attemptId}/sql-answer`, { question_id: questionId, query }).then(r => r.data)

export const completeSQL = (attemptId) =>
  api.post(`/exam/${attemptId}/sql/complete`).then(r => r.data)

// ── Section 4: DSA Coding ──────────────────────────────────────────
export const getCodingProblems = (attemptId) =>
  api.get(`/exam/${attemptId}/coding`).then(r => r.data)

export const runCode = (attemptId, questionId, sourceCode, language = 'python') =>
  api.post(`/exam/${attemptId}/coding/run`, { question_id: questionId, source_code: sourceCode, language }).then(r => r.data)

export const submitCode = (attemptId, submissions, language = 'python') =>
  api.post(`/exam/${attemptId}/coding/submit`, typeof submissions === 'string' ? { source_code: submissions, language } : { submissions, language }).then(r => r.data)

// ── Result & Admin ─────────────────────────────────────────────────
export const getResult = (attemptId) =>
  api.get(`/exam/${attemptId}/result`).then(r => r.data)

export const adminListAttempts = () =>
  api.get('/admin/attempts').then(r => r.data)

export const adminGetAttempt = (attemptId) =>
  api.get(`/admin/attempts/${attemptId}`).then(r => r.data)

// ── College ID Card Photo (pre-exam identity verification) ──────────────────
/**
 * Upload a College ID card photo (base64 data URL) to the backend.
 * Previous photos for this user are automatically and permanently deleted.
 * The stored photo expires and is permanently deleted after 24 hours.
 */
export const uploadIDPhoto = (userId, imageDataUrl, attemptId = null) =>
  api.post('/exam/id-photo/upload', {
    user_id:    userId,
    image_data: imageDataUrl,
    attempt_id: attemptId,
  }).then(r => r.data)

/**
 * Immediately and permanently delete a College ID photo by photo_id.
 * Used when the candidate chooses to retake their ID photo.
 */
export const deleteIDPhoto = (photoId) =>
  api.delete(`/exam/id-photo/${photoId}`).then(r => r.data)

export default api
