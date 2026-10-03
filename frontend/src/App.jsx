import { BrowserRouter, useNavigate } from 'react-router-dom'
import AppRouter from './app/router'
import { ToastProvider } from './components/ToastProvider'
import { handlePendingRefresh } from './utils/refreshGuard'
import { useEffect, useState } from 'react'
import './index.css'

/**
 * Inner component that has access to the router context (useNavigate).
 * On mount it checks for a pending refresh-submit flag and handles it
 * before the rest of the app renders.
 */
function RefreshGuard({ children }) {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    handlePendingRefresh().then(wasRefresh => {
      if (wasRefresh) {
        // Redirect to completed page — shows ✓ normal submit style
        navigate('/exam/completed', { replace: true })
      }
      setReady(true)
    })
  }, [navigate])

  if (!ready) {
    // Tiny invisible placeholder while we resolve the async check
    return <div style={{ position: 'fixed', inset: 0, background: '#0d1117' }} />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <RefreshGuard>
          <AppRouter />
        </RefreshGuard>
      </ToastProvider>
    </BrowserRouter>
  )
}
