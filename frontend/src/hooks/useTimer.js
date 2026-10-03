import { useState, useEffect, useRef, useCallback } from 'react'
import { getOrInitSectionTimer } from '../utils/sectionTimer'
import { toast } from '../components/ToastProvider'

export function useTimer(timerKey) {
  const [timerData, setTimerData] = useState(() => getOrInitSectionTimer(timerKey))
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!timerData?.endTime) return 0
    return Math.max(0, Math.floor((timerData.endTime - Date.now()) / 1000))
  })

  const intervalRef = useRef(null)
  const warned5 = useRef(false)
  const warned1 = useRef(false)
  const hasTimedOut = useRef(false)

  // Re-initialize when timerKey changes
  useEffect(() => {
    if (!timerKey) return
    warned5.current = false
    warned1.current = false
    hasTimedOut.current = false

    const data = getOrInitSectionTimer(timerKey)
    setTimerData(data)

    if (data?.endTime) {
      setSecondsLeft(Math.max(0, Math.floor((data.endTime - Date.now()) / 1000)))
    }
  }, [timerKey])

  // Listen to manual extensions or changes
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.timerKey === timerKey) {
        setTimerData(e.detail)
        hasTimedOut.current = false
        if (e.detail.endTime) {
          setSecondsLeft(Math.max(0, Math.floor((e.detail.endTime - Date.now()) / 1000)))
        }
      }
    }
    window.addEventListener('codeeval_timer_changed', handler)
    return () => window.removeEventListener('codeeval_timer_changed', handler)
  }, [timerKey])

  const calcRemaining = useCallback(() => {
    if (!timerData?.endTime) return 0
    return Math.max(0, Math.floor((timerData.endTime - Date.now()) / 1000))
  }, [timerData])

  useEffect(() => {
    if (!timerData?.endTime) return

    intervalRef.current = setInterval(() => {
      const remaining = calcRemaining()
      setSecondsLeft(remaining)

      // Warning toasts
      if (remaining === 300 && !warned5.current) {
        warned5.current = true
        toast.warn('5 minutes remaining for this section!', 5000)
      }
      if (remaining === 60 && !warned1.current) {
        warned1.current = true
        toast.error('1 minute remaining — wrap up your answers!', 7000)
      }

      // Section Timeout Event
      if (remaining === 0 && !hasTimedOut.current) {
        hasTimedOut.current = true
        clearInterval(intervalRef.current)
        window.dispatchEvent(new CustomEvent('codeeval_section_timeout', { detail: { timerKey } }))
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [timerData, calcRemaining, timerKey])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const isWarning = secondsLeft <= 300 && secondsLeft > 60
  const isCritical = secondsLeft <= 60 && secondsLeft > 0
  const isExpired = secondsLeft === 0

  const total = timerData?.totalSeconds || 25 * 60
  const fraction = Math.min(1, Math.max(0, secondsLeft / total))

  return { secondsLeft, formatted, isWarning, isCritical, isExpired, fraction, timerKey }
}
