import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, FileText } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'

export function QuickNoteOverlay() {
  const { quickNoteOpen, setQuickNoteOpen } = useBrowserStore()

  // Cmd+Shift+M でトグル
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'm') {
        e.preventDefault()
        setQuickNoteOpen(!quickNoteOpen)
      }
      if (e.key === 'Escape' && quickNoteOpen) {
        setQuickNoteOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [quickNoteOpen])

  return (
    <AnimatePresence>
      {quickNoteOpen && <QuickNotePanel />}
    </AnimatePresence>
  )
}

function QuickNotePanel() {
  const {
    quickNotes, addQuickNote, updateQuickNote, removeQuickNote, setQuickNoteOpen
  } = useBrowserStore()
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    quickNotes[0]?.id || null
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeNote = quickNotes.find(n => n.id === activeNoteId)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [activeNoteId])

  const handleNewNote = () => {
    const note = addQuickNote()
    setActiveNoteId(note.id)
  }

  const handleDelete = (id: string) => {
    removeQuickNote(id)
    const remaining = quickNotes.filter(n => n.id !== id)
    setActiveNoteId(remaining[0]?.id || null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--cmdk-bg)',
        border: '1px solid var(--cmdk-border)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        maxHeight: 420,
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={13} style={{ color: 'var(--accent-primary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Quick Notes
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            ⌘⇧M
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewNote}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--text-muted)' }}
            title="新規ノート"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setQuickNoteOpen(false)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* ノート一覧タブ */}
      {quickNotes.length > 1 && (
        <div
          className="flex gap-1 px-2 py-1.5 overflow-x-auto flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {quickNotes.map(note => (
            <button
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full transition-colors truncate max-w-24"
              style={{
                background: note.id === activeNoteId ? 'var(--accent-primary)' : 'var(--sidebar-hover)',
                color: note.id === activeNoteId ? 'white' : 'var(--text-muted)',
              }}
            >
              {note.content.split('\n')[0].slice(0, 16) || 'Untitled'}
            </button>
          ))}
        </div>
      )}

      {/* テキストエリア */}
      <div className="flex-1 relative overflow-hidden">
        {activeNote ? (
          <>
            <textarea
              ref={textareaRef}
              value={activeNote.content}
              onChange={e => updateQuickNote(activeNote.id, e.target.value)}
              placeholder="メモを入力... (⌘⇧M で閉じる)"
              className="w-full h-full p-3 text-sm bg-transparent outline-none resize-none"
              style={{ color: 'var(--text-primary)', minHeight: 200 }}
            />
            {activeNote.content && (
              <button
                onClick={() => handleDelete(activeNote.id)}
                className="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity hover:bg-red-500/10"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ノートがありません</p>
            <button
              onClick={handleNewNote}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              最初のノートを作成
            </button>
          </div>
        )}
      </div>

      {/* フッター */}
      {activeNote && (
        <div
          className="px-3 py-1.5 text-[10px] flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {activeNote.content.length} 文字 · {new Date(activeNote.updatedAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </motion.div>
  )
}
