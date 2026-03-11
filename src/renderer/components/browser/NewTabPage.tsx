import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Globe, Clock, Bookmark, Plus, TrendingUp, X, Check } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate } from '../../hooks/useIpc'
import { format } from 'date-fns'

// ---- Starfield ----
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stars = useMemo(() => Array.from({ length: 120 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.4 + 0.3,
    speed: Math.random() * 0.00015 + 0.00005,
    opacity: Math.random() * 0.5 + 0.15,
    twinkle: Math.random() * Math.PI * 2,
  })), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    let t = 0

    const draw = () => {
      const w = canvas.width = canvas.offsetWidth
      const h = canvas.height = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      t += 1
      stars.forEach(s => {
        const twinkle = 0.6 + 0.4 * Math.sin(t * 0.04 + s.twinkle)
        ctx.beginPath()
        ctx.arc(s.x * w, ((s.y + s.speed * t) % 1) * h, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180,140,160,${s.opacity * twinkle})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [stars])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

const SITE_ICONS: Record<string, string> = {
  'google.com': 'https://www.google.com/favicon.ico',
  'github.com': 'https://github.com/favicon.ico',
  'youtube.com': 'https://www.youtube.com/favicon.ico',
  'twitter.com': 'https://twitter.com/favicon.ico',
  'x.com': 'https://x.com/favicon.ico',
}

function getFaviconUrl(url: string) {
  try {
    const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', '')
    if (SITE_ICONS[hostname]) return SITE_ICONS[hostname]
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch { return null }
}

export function NewTabPage() {
  const [query, setQuery] = useState('')
  const [time, setTime] = useState(new Date())
  const [addingLink, setAddingLink] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const { history, bookmarks, quickLinks, addQuickLink, removeQuickLink } = useBrowserStore()
  const { navigate } = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(query)
  }

  const handleAddLink = () => {
    if (!newUrl.trim()) return
    const title = newTitle.trim() || new URL(newUrl.startsWith('http') ? newUrl : 'https://' + newUrl).hostname
    addQuickLink({ title, url: newUrl.startsWith('http') ? newUrl : 'https://' + newUrl })
    setNewTitle('')
    setNewUrl('')
    setAddingLink(false)
  }

  const recentHistory = history.slice(0, 6)
  const recentBookmarks = bookmarks.slice(0, 4)

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center overflow-y-auto p-8 relative newtab-gradient-animated"
      style={{ background: 'var(--new-tab-bg)' }}
    >
      {/* Starfield */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <StarField />
        {/* ambient glow blobs */}
        <div style={{
          position: 'absolute', width: 500, height: 500,
          borderRadius: '50%', top: '-10%', left: '-5%',
          background: 'radial-gradient(circle, rgba(var(--space-color-rgb,107,79,232),0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%', bottom: '-8%', right: '-5%',
          background: 'radial-gradient(circle, rgba(var(--space-color-rgb,107,79,232),0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Time & Date */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-10"
      >
        <div
          className="text-7xl font-thin tracking-tight mb-2"
          style={{
            color: 'var(--text-primary)',
            fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif',
            fontWeight: 100,
          }}
        >
          {format(time, 'HH:mm')}
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {format(time, 'EEEE, MMMM d')}
        </div>
      </motion.div>

      {/* Search bar */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        onSubmit={handleSearch}
        className="w-full max-w-xl mb-10"
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg transition-all"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or enter URL"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--text-primary)' }}
          />
          {query && (
            <kbd
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                background: 'var(--sidebar-hover)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)'
              }}
            >
              ↵
            </kbd>
          )}
        </div>
      </motion.form>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4 mb-10 justify-center max-w-2xl"
      >
        {quickLinks.map((link, i) => {
          const favicon = getFaviconUrl(link.url)
          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className="flex flex-col items-center gap-2 group relative"
            >
              <button
                onClick={() => navigate(link.url)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(10px)',
                  color: 'var(--text-secondary)',
                }}
              >
                {favicon
                  ? <img src={favicon} alt="" className="w-6 h-6 object-contain rounded-sm" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  : <Globe size={22} />
                }
              </button>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{link.title}</span>
              {/* 削除ボタン（ホバー時） */}
              <button
                onClick={() => removeQuickLink(link.id)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'var(--text-muted)', color: 'white' }}
              >
                <X size={9} />
              </button>
            </motion.div>
          )
        })}

        {/* Add quick link */}
        <AnimatePresence mode="wait">
          {addingLink ? (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
              className="flex flex-col gap-1.5 p-3 rounded-2xl"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', width: 160 }}
            >
              <input
                autoFocus
                placeholder="URL"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') setAddingLink(false) }}
                className="text-xs bg-transparent outline-none border-b px-1 py-0.5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <input
                placeholder="名前（省略可）"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') setAddingLink(false) }}
                className="text-xs bg-transparent outline-none border-b px-1 py-0.5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <div className="flex gap-1 mt-1">
                <button onClick={handleAddLink} className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-lg" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                  <Check size={11} /> 追加
                </button>
                <button onClick={() => setAddingLink(false)} className="flex-1 text-xs py-1 rounded-lg" style={{ background: 'var(--sidebar-hover)', color: 'var(--text-muted)' }}>
                  キャンセル
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 + quickLinks.length * 0.04 }}
              onClick={() => setAddingLink(true)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 border-dashed"
                style={{
                  background: 'transparent',
                  border: '1.5px dashed var(--border)',
                  color: 'var(--text-muted)'
                }}
              >
                <Plus size={20} />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>追加</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent / Bookmarks grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-2xl grid grid-cols-2 gap-4"
      >
        {recentHistory.length > 0 && (
          <div>
            <div
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <Clock size={11} />
              Recent
            </div>
            <div className="flex flex-col gap-1">
              {recentHistory.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => navigate(entry.url)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:scale-[1.02]"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {entry.favicon ? (
                    <img src={entry.favicon} alt="" className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />
                  ) : (
                    <Globe size={14} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
                  )}
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {entry.title || entry.url}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recentBookmarks.length > 0 && (
          <div>
            <div
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <Bookmark size={11} />
              Bookmarks
            </div>
            <div className="flex flex-col gap-1">
              {recentBookmarks.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => navigate(bm.url)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:scale-[1.02]"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {bm.favicon ? (
                    <img src={bm.favicon} alt="" className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />
                  ) : (
                    <Bookmark size={14} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
                  )}
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {bm.title || bm.url}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recentHistory.length === 0 && recentBookmarks.length === 0 && (
          <div className="col-span-2 text-center py-8">
            <TrendingUp size={24} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Start browsing to see your recent pages here
            </p>
          </div>
        )}
      </motion.div>
    </div>
      </div>
  )
}
