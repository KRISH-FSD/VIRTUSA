import { useTimer } from '../hooks/useTimer'

export default function Timer({ expiresAt }) {
  const { formatted, isWarning, isCritical } = useTimer(expiresAt)

  const cls = isCritical ? 'timer critical' : isWarning ? 'timer warning' : 'timer'
  return <span className={cls}>{formatted}</span>
}
