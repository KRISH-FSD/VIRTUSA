import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminListAttempts } from '../services/api'
import { RefreshCw, LogOut } from 'lucide-react'

function statusBadge(status) {
  const map = {
    COMPLETED: 'badge-completed',
    MCQ_IN_PROGRESS: 'badge-progress',
    EXCEL_IN_PROGRESS: 'badge-progress',
    SQL_IN_PROGRESS: 'badge-progress',
    CODING_IN_PROGRESS: 'badge-progress',
    EXPIRED: 'badge-expired',
  }
  return <span className={`badge ${map[status] || 'badge-progress'}`}>{status}</span>
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminAttempts() {
  const navigate = useNavigate()
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    adminListAttempts().then(data => {
      setAttempts(data.attempts)
      setLoading(false)
    }).catch(() => {
      setError('Failed to load candidate attempts')
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  function handleLogout() {
    sessionStorage.removeItem('admin_auth')
    navigate('/', { replace: true })
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg-editor)' }}>
      {/* Header */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel2)', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          CANDIDATE ATTEMPTS (ADMIN: {sessionStorage.getItem('admin_auth') || 'KRISH'})
        </span>
        <span className="badge badge-progress" style={{ fontSize: 10 }}>{attempts.length}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load} style={{ padding: '3px 10px' }}>
            <RefreshCw size={11} /> Refresh
          </button>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ padding: '3px 10px', color: '#f85149' }}>
            <LogOut size={11} /> Sign Out
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div style={{ padding: 20, color: 'var(--error)', fontFamily: 'var(--font-code)', fontSize: 12 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Candidate ID</th>
              <th>1. MCQ (30)</th>
              <th>2. Excel (20)</th>
              <th>3. SQL (20)</th>
              <th>4. Coding (40)</th>
              <th>Total (110)</th>
              <th>Status</th>
              <th>Started</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {attempts.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  No candidate attempts recorded yet
                </td>
              </tr>
            )}
            {attempts.map(a => (
              <tr key={a.id} onClick={() => navigate(`/admin/attempts/${a.id}`)}>
                <td style={{ fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>#{a.id}</td>
                <td style={{ fontFamily: 'var(--font-code)', color: 'var(--text-white)', fontWeight: 600 }}>{a.user_id}</td>
                <td style={{ fontFamily: 'var(--font-code)' }}>{a.mcq_score != null ? `${a.mcq_score}/30` : '—'}</td>
                <td style={{ fontFamily: 'var(--font-code)' }}>{a.excel_score != null ? `${a.excel_score}/20` : '—'}</td>
                <td style={{ fontFamily: 'var(--font-code)' }}>{a.sql_score != null ? `${a.sql_score}/20` : '—'}</td>
                <td style={{ fontFamily: 'var(--font-code)' }}>{a.coding_score != null ? `${a.coding_score}/40` : '—'}</td>
                <td style={{ fontFamily: 'var(--font-code)', fontWeight: 700, color: '#3fb950' }}>
                  {a.total_score != null ? `${a.total_score}/110` : '—'}
                </td>
                <td>{statusBadge(a.status)}</td>
                <td style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)' }}>{fmt(a.started_at)}</td>
                <td style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)' }}>{fmt(a.completed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
