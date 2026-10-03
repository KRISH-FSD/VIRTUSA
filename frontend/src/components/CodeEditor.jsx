import Editor from '@monaco-editor/react'
import { toast } from './ToastProvider'

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
  lineNumbers: 'on',
  minimap: { enabled: false },
  wordWrap: 'off',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  renderWhitespace: 'selection',
  cursorBlinking: 'smooth',
  smoothScrolling: true,
  padding: { top: 10, bottom: 10 },
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
}

export default function CodeEditor({ value, onChange, readOnly = false, onRun, onSubmit, language = 'python' }) {
  function handleEditorMount(editor, monaco) {
    if (!readOnly && onRun) {
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => onRun()
      )
    }
    if (!readOnly && onSubmit) {
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        () => onSubmit()
      )
    }

    // Intercept and disable page reload inside Monaco Editor
    const onBlockedReload = () => {
      toast.warn('Page reload is strictly disabled during the assessment', 2500)
    }

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, onBlockedReload)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, onBlockedReload)
    editor.addCommand(monaco.KeyCode.F5, onBlockedReload)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5, onBlockedReload)

    editor.onKeyDown((e) => {
      const isR = e.keyCode === monaco.KeyCode.KeyR || e.code === 'KeyR'
      const isF5 = e.keyCode === monaco.KeyCode.F5 || e.code === 'F5'
      if (((e.ctrlKey || e.metaKey) && isR) || isF5) {
        e.preventDefault()
        e.stopPropagation()
        onBlockedReload()
      }
    })
  }

  return (
    <Editor
      height="100%"
      language={language || 'python'}
      theme="vs-dark"
      value={value}
      onChange={readOnly ? undefined : onChange}
      options={{
        ...MONACO_OPTIONS,
        readOnly,
        domReadOnly: readOnly,
      }}
      onMount={handleEditorMount}
      loading={
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: 'var(--text-muted)', fontFamily: 'var(--font-code)',
          fontSize: 12
        }}>
          Loading editor...
        </div>
      }
    />
  )
}
