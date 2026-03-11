import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, X, Save } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'

export function TabMemoButton() {
  const [open, setOpen] = useState(false)
  const { tabs, activeTabId } = useBrowserStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const hasMemo = useBrowserStore(s => !!s.tabMemos[activeTabId || '']?.content)

  if (!activeTab || activeTab.url === 'about:newtab') return null

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="no-drag w-7 h-7 flex items-center justify-center rounded-lg transition-all relative"
        title="タブメモ"
        style={{ color: open ? 'var(--accent-primary)' : hasMemo ? '#f59e0b' : 'var(--text-muted)' }}
      >
        <StickyNote size={14} />
        {hasMemo && (
          <span
            className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#f59e0b' }}
          />
        )}
      </button>

      <AnimatePresence>
        {open && <TabMemoPanel tabId={activeTabId!} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

function TabMemoPanel({ tabId, onClose }: { tabId: string; onClose: () => void }) {
  const { tabMemos, setTabMemo } = useBrowserStore()
  const memo = tabMemos[tabId]
  const [value, setValue] = useState(memo?.content || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const save = () => {
    setTabMemo(tabId, value)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-12 right-4 z-50 w-72 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: 'var(--cmdk-bg)',
        border: '1px solid var(--cmdk-border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <StickyNote size={13} style={{ color: '#f59e0b' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Tab Memo
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={save}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-colors"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            <Save size={10} />
            Save
          </button>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* テキストエリア */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        placeholder="このタブのメモ..."
        className="w-full p-3 text-sm bg-transparent outline-none resize-none"
        style={{ color: 'var(--text-primary)', minHeight: 140 }}
      />

      {memo?.updatedAt && (
        <div
          className="px-3 pb-2 text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          最終更新: {new Date(memo.updatedAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </motion.div>
  )
}
