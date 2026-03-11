import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Globe, Clock, Bookmark, Plus, ArrowRight,
  Settings, Download, Layout, Command, Hash
} from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate } from '../../hooks/useIpc'
import { format } from 'date-fns'
import clsx from 'clsx'

type ResultType = 'tab' | 'bookmark' | 'history' | 'action' | 'search'

interface Result {
  id: string
  type: ResultType
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action: () => void
}

export function CommandPalette() {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    setCommandPaletteOpen, searchTabs, searchBookmarks, searchHistory,
    tabs, setSidebarPanel
  } = useBrowserStore()
  const { navigate, openNewTab, closeTab } = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Build results
  const results: Result[] = []

  if (query) {
    // Tabs
    const matchedTabs = searchTabs(query).slice(0, 4)
    matchedTabs.forEach(tab => {
      results.push({
        id: `tab-${tab.id}`,
        type: 'tab',
        title: tab.title || 'New Tab',
        subtitle: tab.url,
        icon: tab.favicon ? (
          <img src={tab.favicon} alt="" className="w-4 h-4 object-contain rounded-sm" />
        ) : <Layout size={14} />,
        action: () => {
          useBrowserStore.getState().setActiveTab(tab.id)
          close()
        }
      })
    })

    // Bookmarks
    const matchedBookmarks = searchBookmarks(query).slice(0, 3)
    matchedBookmarks.forEach(bm => {
      results.push({
        id: `bm-${bm.id}`,
        type: 'bookmark',
        title: bm.title || bm.url,
        subtitle: bm.url,
        icon: bm.favicon
          ? <img src={bm.favicon} alt="" className="w-4 h-4 object-contain rounded-sm" />
          : <Bookmark size={14} />,
        action: () => { navigate(bm.url); close() }
      })
    })

    // History
    const matchedHistory = searchHistory(query).slice(0, 4)
    matchedHistory.forEach(entry => {
      results.push({
        id: `hist-${entry.id}`,
        type: 'history',
        title: entry.title || entry.url,
        subtitle: entry.url,
        icon: entry.favicon
          ? <img src={entry.favicon} alt="" className="w-4 h-4 object-contain rounded-sm" />
          : <Clock size={14} />,
        action: () => { navigate(entry.url); close() }
      })
    })

    // Search action
    results.push({
      id: 'search',
      type: 'search',
      title: `Search Google for "${query}"`,
      icon: <Search size={14} />,
      action: () => { navigate(`https://www.google.com/search?q=${encodeURIComponent(query)}`); close() }
    })

    // Navigate to URL
    if (query.includes('.') || query.startsWith('http')) {
      results.push({
        id: 'navigate',
        type: 'action',
        title: `Go to ${query}`,
        icon: <Globe size={14} />,
        action: () => { navigate(query); close() }
      })
    }
  } else {
    // Default: show actions
    const actions: Result[] = [
      {
        id: 'new-tab',
        type: 'action',
        title: 'New Tab',
        subtitle: '⌘T',
        icon: <Plus size={14} />,
        action: () => { openNewTab(); close() }
      },
      {
        id: 'bookmarks',
        type: 'action',
        title: 'Open Bookmarks',
        icon: <Bookmark size={14} />,
        action: () => { setSidebarPanel('bookmarks'); close() }
      },
      {
        id: 'history',
        type: 'action',
        title: 'Open History',
        icon: <Clock size={14} />,
        action: () => { setSidebarPanel('history'); close() }
      },
      {
        id: 'downloads',
        type: 'action',
        title: 'Open Downloads',
        icon: <Download size={14} />,
        action: () => { setSidebarPanel('downloads'); close() }
      },
      {
        id: 'settings',
        type: 'action',
        title: 'Open Settings',
        icon: <Settings size={14} />,
        action: () => { setSidebarPanel('settings' as any); close() }
      },
    ]

    // Recent tabs
    const recentTabs = [...tabs].sort((a, b) => b.lastVisited - a.lastVisited).slice(0, 5)
    recentTabs.forEach(tab => {
      actions.push({
        id: `tab-${tab.id}`,
        type: 'tab',
        title: tab.title || 'New Tab',
        subtitle: tab.url,
        icon: tab.favicon
          ? <img src={tab.favicon} alt="" className="w-4 h-4 object-contain rounded-sm" />
          : <Layout size={14} />,
        action: () => {
          useBrowserStore.getState().setActiveTab(tab.id)
          close()
        }
      })
    })

    results.push(...actions)
  }

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
  }, [setCommandPaletteOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      results[selectedIdx]?.action()
      return
    }
  }

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0) }, [query])

  const typeLabels: Record<ResultType, string> = {
    tab: 'Tab',
    bookmark: 'Bookmark',
    history: 'History',
    action: 'Action',
    search: 'Search'
  }

  const typeColors: Record<ResultType, string> = {
    tab: 'var(--accent-primary)',
    bookmark: '#f59e0b',
    history: 'var(--text-muted)',
    action: 'var(--accent-secondary)',
    search: '#22c55e'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="command-palette-overlay"
      onClick={close}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: 'var(--cmdk-bg)',
          border: '1px solid var(--cmdk-border)',
          boxShadow: 'var(--cmdk-shadow)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--cmdk-border)' }}
        >
          <Command size={16} style={{ color: 'var(--accent-primary)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tabs, bookmarks, history..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd
            className="text-xs px-2 py-0.5 rounded-md flex-shrink-0"
            style={{
              background: 'var(--sidebar-hover)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)'
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((result, idx) => (
                <motion.button
                  key={result.id}
                  layout
                  className={clsx(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left',
                    'transition-all duration-100 outline-none',
                    selectedIdx === idx
                      ? 'bg-[var(--cmdk-item-active)]'
                      : 'hover:bg-[var(--cmdk-item-hover)]'
                  )}
                  onClick={result.action}
                  onMouseEnter={() => setSelectedIdx(idx)}
                >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: `${typeColors[result.type]}18`,
                      color: typeColors[result.type]
                    }}
                  >
                    {result.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {result.subtitle}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: `${typeColors[result.type]}18`,
                        color: typeColors[result.type],
                        fontSize: '10px',
                        fontWeight: 500,
                      }}
                    >
                      {typeLabels[result.type]}
                    </span>
                    {selectedIdx === idx && (
                      <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Hash size={24} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No results found
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs"
          style={{
            borderTop: '1px solid var(--cmdk-border)',
            color: 'var(--text-muted)'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-[var(--sidebar-hover)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[var(--sidebar-hover)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs">↵</kbd>
              Select
            </span>
          </div>
          <span>{results.length} results</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
