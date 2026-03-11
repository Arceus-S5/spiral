import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bookmark, Trash2, ExternalLink, FolderOpen, Search,
  Clock, Globe, Calendar, ChevronRight
} from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate } from '../../hooks/useIpc'
import { format, isToday, isYesterday, startOfDay } from 'date-fns'
import clsx from 'clsx'

// ============================================================
// Bookmarks Panel
// ============================================================
export function BookmarksPanel() {
  const [search, setSearch] = useState('')
  const { searchBookmarks, removeBookmark } = useBrowserStore()
  const { navigate } = useNavigate()
  const bookmarks = searchBookmarks(search)

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'var(--cmdk-input-bg)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark size={20} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No bookmarks found' : 'No bookmarks yet'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {bookmarks.map(bm => (
              <div key={bm.id}
                className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer
                  hover:bg-[var(--sidebar-hover)] transition-colors"
                onClick={() => navigate(bm.url)}
              >
                {bm.favicon ? (
                  <img src={bm.favicon} alt="" className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />
                ) : (
                  <Bookmark size={13} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {bm.title || bm.url}
                  </div>
                  <div className="text-xs truncate opacity-60" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    {bm.url}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeBookmark(bm.id) }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center
                    hover:bg-red-500/10 hover:text-red-500 transition-all flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// History Panel
// ============================================================
export function HistoryPanel() {
  const [search, setSearch] = useState('')
  const { searchHistory, clearHistory } = useBrowserStore()
  const { navigate } = useNavigate()
  const entries = searchHistory(search)

  // Group by date
  const grouped: Record<string, typeof entries> = {}
  for (const entry of entries) {
    const date = startOfDay(entry.visitedAt).getTime().toString()
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(entry)
  }

  const getDateLabel = (timestamp: string) => {
    const date = new Date(parseInt(timestamp))
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'var(--cmdk-input-bg)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history..."
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {entries.length > 0 && (
        <div className="px-2 pb-2 flex justify-end flex-shrink-0">
          <button
            onClick={() => clearHistory()}
            className="text-xs hover:text-red-500 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-8">
            <Clock size={20} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No history found' : 'No history yet'}
            </p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([dateTs, entries]) => (
              <div key={dateTs} className="mb-3">
                <div className="section-header flex items-center gap-1.5 mb-1">
                  <Calendar size={10} />
                  {getDateLabel(dateTs)}
                </div>
                <div className="flex flex-col gap-0.5">
                  {entries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => navigate(entry.url)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left
                        hover:bg-[var(--sidebar-hover)] transition-colors"
                    >
                      {entry.favicon ? (
                        <img src={entry.favicon} alt="" className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />
                      ) : (
                        <Globe size={13} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {entry.title || entry.url}
                        </div>
                        <div className="text-xs opacity-50 truncate" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                          {format(entry.visitedAt, 'HH:mm')} · {entry.visitCount} visit{entry.visitCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// Downloads Panel
// ============================================================
export function DownloadsPanel() {
  const { downloads, removeDownload } = useBrowserStore()
  const { send } = require('../../hooks/useIpc').useIpc()

  const sortedDownloads = [...downloads].sort((a, b) => b.startTime - a.startTime)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const getProgress = (d: typeof downloads[0]) => {
    if (d.totalBytes === 0) return 0
    return (d.receivedBytes / d.totalBytes) * 100
  }

  const stateColors: Record<string, string> = {
    completed: 'var(--text-success, #22c55e)',
    progressing: 'var(--accent-primary)',
    interrupted: '#f59e0b',
    cancelled: 'var(--text-muted)',
    pending: 'var(--accent-secondary)',
  }

  return (
    <div className="h-full flex flex-col px-2 pb-2 overflow-y-auto">
      {sortedDownloads.length === 0 ? (
        <div className="text-center py-8">
          <ChevronRight size={20} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No downloads</p>
        </div>
      ) : (
        <>
          {sortedDownloads.map(dl => (
            <div key={dl.id} className="flex flex-col gap-1.5 py-2.5"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                    {dl.filename}
                  </div>
                  <div className="text-xs flex items-center gap-2 mt-0.5">
                    <span style={{ color: stateColors[dl.state] || 'var(--text-muted)', fontSize: '10px', fontWeight: 500 }}>
                      {dl.state.charAt(0).toUpperCase() + dl.state.slice(1)}
                    </span>
                    {dl.totalBytes > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        {formatSize(dl.receivedBytes)} / {formatSize(dl.totalBytes)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {dl.state === 'completed' && (
                    <button
                      onClick={() => send('download:show', dl.id)}
                      className="w-6 h-6 rounded flex items-center justify-center
                        hover:bg-[var(--sidebar-hover)] transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      title="Show in Finder"
                    >
                      <ExternalLink size={11} />
                    </button>
                  )}
                  {dl.state === 'progressing' && (
                    <button
                      onClick={() => send('download:cancel', dl.id)}
                      className="w-6 h-6 rounded flex items-center justify-center
                        hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      title="Cancel"
                    >
                      ×
                    </button>
                  )}
                  <button
                    onClick={() => removeDownload(dl.id)}
                    className="w-6 h-6 rounded flex items-center justify-center
                      hover:bg-[var(--sidebar-hover)] transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Remove"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {dl.state === 'progressing' && dl.totalBytes > 0 && (
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--accent-primary)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgress(dl)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => send('download:clear')}
            className="mt-3 text-xs text-center w-full py-1.5 rounded-lg
              hover:bg-[var(--sidebar-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear completed
          </button>
        </>
      )}
    </div>
  )
}
