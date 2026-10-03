import { useNavigate } from 'react-router-dom'
import { FileText, Table, Database, Code2, CheckCircle, LayoutList, Settings } from 'lucide-react'
import { toast } from './ToastProvider'

const EXAM_ITEMS = [
  { icon: FileText,    label: 'MCQ',      path: '/exam/mcq',      key: 'mcq'   },
  { icon: Table,       label: 'Excel',    path: '/exam/excel',    key: 'excel' },
  { icon: Database,    label: 'SQL',      path: '/exam/sql',      key: 'sql'   },
  { icon: Code2,       label: 'Code',     path: '/exam/coding',   key: 'code'  },
]

const ADMIN_ITEMS = [
  { icon: LayoutList,  label: 'Attempts', path: '/admin', key: 'admin' },
  { icon: Settings,    label: 'Settings', path: null,     key: 'settings' },
]

export default function SideRail({ mode = 'exam', activeKey }) {
  const navigate = useNavigate()
  const items = mode === 'admin' ? ADMIN_ITEMS : EXAM_ITEMS

  const handleItemClick = (item) => {
    if (mode === 'admin') {
      if (item.path) navigate(item.path)
      return
    }
    if (item.key !== activeKey) {
      toast.info('Section navigation is locked. The section will automatically advance when the timer expires.')
    }
  }

  return (
    <div className="side-rail">
      {items.map(({ icon: Icon, label, path, key }) => (
        <button
          key={key}
          className={`rail-btn ${activeKey === key ? 'active' : ''}`}
          onClick={() => handleItemClick({ path, key })}
          title={label}
          style={{ cursor: mode === 'admin' && path ? 'pointer' : 'default' }}
        >
          <Icon size={18} />
          <span className="rail-tooltip">{label}</span>
        </button>
      ))}

      {/* Admin Settings link ONLY visible in admin mode */}
      {mode === 'admin' && (
        <div style={{ marginTop: 'auto' }}>
          <button
            className="rail-btn active"
            title="Examiner Settings"
          >
            <Settings size={16} />
            <span className="rail-tooltip">Settings</span>
          </button>
        </div>
      )}
    </div>
  )
}
