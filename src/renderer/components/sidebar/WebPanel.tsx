// ============================================================
// Web Panel — サイドバーにウェブサイトを固定表示
// ============================================================
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Globe, ChevronLeft, ChevronRight, RotateCw, Edit2, Check } from 'lucide-react'

interface WebPanelItem {
  id: string
  title: string
  url: string
  favicon?: string
}

const DEFAULT_PANELS: WebPanelItem[] = [
  { id: 'google', title: 'Google', url: 'https://www.google.com', favicon: 'https://www.google.com/favicon.ico' },
]

const SUGGESTIONS = [
  { title: 'Google', url: 'https://www.google.com' },
  { title: 'Gmail', url: 'https://mail.google.com' },
  { title: 'Google Calendar', url: 'https://calendar.google.com' },
  { title: 'YouTube', url: 'https://www.youtube.com' },
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Notion', url: 'https://www.notion.so' },
  { title: 'Twitter / X', url: 'https://x.com' },
  { title: 'Slack', url: 'https://app.slack.com' },
]

export function WebPanel() {
  const [panels, setPanels] = useState<WebPanelItem[]>(() => {
    try {
      const saved = localStorage.getItem('spiral:webpanels')
      return saved ? JSON.parse(saved) : DEFAULT_PANELS
    } catch { return DEFAULT_PANELS }
  })
  const [activeId, setActiveId] = useState<string>(panels[0]?.id || '')
  const [adding, setAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const webviewRefs = useRef<Record<string, any>>({})

  const save = (items: WebPanelItem[]) => {
    setPanels(items)
    try { localStorage.setItem('spiral:webpanels', JSON.stringify(items)) } catch {}
  }

  const addPanel = () => {
    if (!newUrl.trim()) return
    const url = newUrl.startsWith('http') ? newUrl : 'https://' + newUrl
    const title = newTitle.trim() || (new URL(url).hostname)
    const id = Date.now().toString()
    const updated = [...panels, { id, title, url, favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` }]
    save(updated)
    setActiveId(id)
    setAdding(false)
    setNewUrl('')
    setNewTitle('')
  }

  const removePanel = (id: string) => {
    const updated = panels.filter(p => p.id !== id)
    save(updated)
    if (activeId === id) setActiveId(updated[0]?.id || '')
  }

  const activePanel = panels.find(p => p.id === activeId)

  const goBack = () => webviewRefs.current[activeId]?.goBack()
  const goForward = () => webviewRefs.current[activeId]?.goForward()
  const reload = () => webviewRefs.current[activeId]?.reload()

  return (
    <div className="h-full flex flex-col" style={{ color: 'var(--text-primary)' }}>
      {/* Panel tabs */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1 flex-shrink-0 flex-wrap">
        {panels.map(p => (
          <div key={p.id} className="relative group">
            <button
              onClick={() => setActiveId(p.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
              style={{
                background: activeId === p.id ? 'var(--sidebar-active)' : 'transparent',
                color: activeId === p.id ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                maxWidth: 90,
              }}
            >
              {p.favicon
                ? <img src={p.favicon} className="w-3 h-3 flex-shrink-0" onError={e => (e.target as any).style.display = 'none'} />
                : <Globe size={10} />
              }
              {editingId === p.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { save(panels.map(x => x.id === p.id ? { ...x, title: editTitle } : x)); setEditingId(null) }
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="w-14 bg-transparent outline-none border-b text-xs"
                  style={{ borderColor: 'var(--accent-primary)' }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="truncate" style={{ maxWidth: 60 }}>{p.title}</span>
              )}
            </button>
            <button
              onClick={() => removePanel(p.id)}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
              style={{ background: 'var(--text-muted)', color: 'white' }}
            >
              <X size={8} />
            </button>
          </div>
        ))}

        <AnimatePresence>
          {adding ? (
            <motion.div
              initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex flex-col gap-1 p-2 rounded-xl"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', minWidth: 180 }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>パネルを追加</div>
              {/* サジェスト */}
              <div className="flex flex-wrap gap-1 mb-1">
                {SUGGESTIONS.map(s => (
                  <button key={s.url} onClick={() => { setNewUrl(s.url); setNewTitle(s.title) }}
                    className="text-xs px-2 py-0.5 rounded-md transition-colors"
                    style={{ background: 'var(--sidebar-hover)', color: 'var(--text-secondary)' }}>
                    {s.title}
                  </button>
                ))}
              </div>
              <input autoFocus placeholder="URL" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addPanel(); if (e.key === 'Escape') setAdding(false) }}
                className="text-xs bg-transparent outline-none border-b px-1 py-0.5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="名前（省略可）" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addPanel(); if (e.key === 'Escape') setAdding(false) }}
                className="text-xs bg-transparent outline-none border-b px-1 py-0.5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              <div className="flex gap-1 mt-1">
                <button onClick={addPanel}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}>
                  <Check size={10} /> 追加
                </button>
                <button onClick={() => setAdding(false)}
                  className="flex-1 text-xs py-1 rounded-lg"
                  style={{ background: 'var(--sidebar-hover)', color: 'var(--text-muted)' }}>
                  キャンセル
                </button>
              </div>
            </motion.div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--sidebar-hover)]"
              style={{ color: 'var(--text-muted)' }}>
              <Plus size={13} />
            </button>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar */}
      {activePanel && (
        <div className="flex items-center gap-1 px-2 pb-1 flex-shrink-0">
          <button onClick={goBack} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--sidebar-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}><ChevronLeft size={13} /></button>
          <button onClick={goForward} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--sidebar-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}><ChevronRight size={13} /></button>
          <button onClick={reload} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--sidebar-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}><RotateCw size={12} /></button>
          <button onClick={() => { setEditingId(activePanel.id); setEditTitle(activePanel.title) }}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--sidebar-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}><Edit2 size={11} /></button>
        </div>
      )}

      {/* Webviews */}
      <div className="flex-1 relative overflow-hidden rounded-lg mx-2 mb-2" style={{ border: '1px solid var(--border)' }}>
        {panels.map(p => (
          <webview
            key={p.id}
            ref={(el: any) => { if (el) webviewRefs.current[p.id] = el }}
            src={p.url}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              display: activeId === p.id ? 'flex' : 'none',
            }}
            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            partition="persist:default"
          />
        ))}
        {panels.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <Globe size={28} style={{ opacity: 0.3 }} />
            <p className="text-xs">上の + からパネルを追加</p>
          </div>
        )}
      </div>
    </div>
  )
}
