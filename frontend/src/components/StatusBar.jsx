export default function StatusBar({ attemptId, language = 'Python 3.x', extra }) {
  return (
    <div className="status-bar">
      <span>{language}</span>
      <span style={{ opacity: 0.6 }}>|</span>
      <span>UTF-8</span>
      <span style={{ opacity: 0.6 }}>|</span>
      <span>Local Assessment</span>
      {attemptId && (
        <>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ fontFamily: 'var(--font-code)' }}>Attempt #{attemptId}</span>
        </>
      )}
      {extra && (
        <>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>{extra}</span>
        </>
      )}
    </div>
  )
}
