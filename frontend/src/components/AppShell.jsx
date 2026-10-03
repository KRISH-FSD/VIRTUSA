import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import SideRail from './SideRail'
import ProctorGuard from './ProctorGuard'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('attempt')) } catch { return null }
}

const PAGE_TITLES = {
  '/': 'Technical Assessment Platform',
  '/exam/mcq': 'Section 1: Programming Language MCQ',
  '/exam/excel': 'Section 2: Excel & Data Analysis',
  '/exam/sql': 'Section 3: SQL Assessment',
  '/exam/coding': 'Section 4: DSA Coding Assessment',
  '/exam/completed': 'Assessment Completed',
  '/admin': 'Admin / Candidate Attempts',
}

const SECTION_KEYS = {
  '/exam/mcq': 'mcq',
  '/exam/excel': 'excel',
  '/exam/sql': 'sql',
  '/exam/coding': 'code',
  '/exam/completed': 'done',
  '/admin': 'admin',
}

export default function AppShell() {
  const location = useLocation()
  const session = getSession()
  const isAdmin = location.pathname.startsWith('/admin')

  const pageTitle = PAGE_TITLES[location.pathname] || 'Technical Assessment Platform'
  const activeKey = SECTION_KEYS[location.pathname] || (isAdmin ? 'admin' : null)

  if (location.pathname === '/' || location.pathname === '/exam/completed') {
    return <Outlet />
  }

  return (
    <div className="app-shell">
      {!isAdmin && <ProctorGuard active={true} />}
      <TopBar
        userId={session?.userId}
        expiresAt={!isAdmin && location.pathname !== '/' ? session?.expiresAt : null}
        pageTitle={pageTitle}
      />
      <SideRail
        mode={isAdmin ? 'admin' : 'exam'}
        activeKey={activeKey}
      />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
