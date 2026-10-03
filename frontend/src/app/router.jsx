import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import StartTest from '../pages/StartTest'
import PreExamFlow from '../pages/PreExamFlow'
import MCQPage from '../pages/MCQPage'
import ExcelPage from '../pages/ExcelPage'
import SQLPage from '../pages/SQLPage'
import CodingPage from '../pages/CodingPage'
import CompletedPage from '../pages/CompletedPage'
import AdminAttempts from '../pages/AdminAttempts'
import AdminReview from '../pages/AdminReview'
import { isExamLocked } from '../utils/authLock'

export default function AppRouter() {
  const locked = isExamLocked()

  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Login / Entry */}
        <Route
          path="/"
          element={locked ? <Navigate to="/exam/completed" replace /> : <StartTest />}
        />

        {/* Pre-exam flow: env check → ID photo → guidelines (3-step) */}
        <Route
          path="/exam/precheck"
          element={locked ? <Navigate to="/exam/completed" replace /> : <PreExamFlow />}
        />

        {/* Exam sections */}
        <Route
          path="/exam/mcq"
          element={locked ? <Navigate to="/exam/completed" replace /> : <MCQPage />}
        />
        <Route
          path="/exam/excel"
          element={locked ? <Navigate to="/exam/completed" replace /> : <ExcelPage />}
        />
        <Route
          path="/exam/sql"
          element={locked ? <Navigate to="/exam/completed" replace /> : <SQLPage />}
        />
        <Route
          path="/exam/coding"
          element={locked ? <Navigate to="/exam/completed" replace /> : <CodingPage />}
        />
        <Route path="/exam/completed" element={<CompletedPage />} />

        {/* Admin endpoints */}
        <Route path="/admin" element={<AdminAttempts />} />
        <Route path="/admin/attempts/:attemptId" element={<AdminReview />} />

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={locked ? "/exam/completed" : "/"} replace />}
        />
      </Route>
    </Routes>
  )
}
