import { useState, useRef, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Bookmark, History, Download,
  Settings, ChevronLeft, ChevronRight, Layout,
  Camera, FolderOpen, Wind, Globe
} from 'lucide-react'
import clsx from 'clsx'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate } from '../../hooks/useIpc'
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher'
import { BookmarksPanel } from './BookmarksPanel'
import { HistoryPanel } from './HistoryPanel'
import { DownloadsPanel } from './DownloadsPanel'
import { SettingsPanel } from '../settings/SettingsPanel'
import { WebPanel } from './WebPanel'

// ---- Starfield ----
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stars = useMemo(() => Array.from({ length: 80 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.2,
    speed: Math.random() * 0.00008 + 0.00003,
    opacity: Math.random() * 0.45 + 0.1,
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
        const twinkle = 0.55 + 0.45 * Math.sin(t * 0.035 + s.twinkle)
        ctx.beginPath()
        ctx.arc(s.x * w, ((s.y + s.speed * t) % 1) * h, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,170,195,${s.opacity * twinkle})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [stars])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  )
}
import { TabItem } from '../tabs/TabItem'
import { PinnedTabs } from '../tabs/PinnedTabs'
import { TabStackList } from '../tabs/TabStackView'
import { SystemStats } from './SystemStats'

type PanelType = 'tabs' | 'bookmarks' | 'history' | 'downloads' | 'settings' | 'webpanel'

const NAV_ITEMS = [
  { id: 'tabs' as PanelType, icon: Layout, label: 'タブ' },
  { id: 'bookmarks' as PanelType, icon: Bookmark, label: 'ブックマーク' },
  { id: 'history' as PanelType, icon: History, label: '履歴' },
  { id: 'downloads' as PanelType, icon: Download, label: 'ダウンロード' },
  { id: 'webpanel' as PanelType, icon: Globe, label: 'Webパネル' },
]

export function Sidebar() {
  const {
    sidebarCollapsed, sidebarActivePanel, activeWorkspaceId,
    tabs, downloads,
    setSidebarCollapsed, setSidebarPanel, setCommandPaletteOpen
  } = useBrowserStore()
  const { openNewTab } = useNavigate()

  const pendingDownloads = downloads.filter(d => d.state === 'progressing').length
  const unpinnedTabs = tabs.filter(t => !t.isPinned && t.workspaceId === activeWorkspaceId)
  const pinnedTabs = tabs.filter(t => t.isPinned)

  /* ---- Collapsed ---- */
  if (sidebarCollapsed) {
    return (
      <div
        className="flex flex-col h-full items-center py-3 gap-1.5 relative z-20 flex-shrink-0 sidebar-gradient-animated"
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          width: 52, minWidth: 52, maxWidth: 52, overflow: 'hidden',
        }}
      >
        <StarField />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, paddingTop: 12 }}>
        <div className="h-8 titlebar-drag w-full" />
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="no-drag w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--sidebar-hover)]"
          style={{ color: 'var(--sidebar-text)' }}
        >
          <ChevronRight size={16} />
        </button>
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setSidebarCollapsed(false); setSidebarPanel(id) }}
            className={clsx(
              'no-drag w-9 h-9 flex items-center justify-center rounded-lg transition-colors relative',
              sidebarActivePanel === id ? 'bg-[var(--sidebar-active)]' : 'hover:bg-[var(--sidebar-hover)]'
            )}
            style={{ color: sidebarActivePanel === id ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)' }}
            title={label}
          >
            <Icon size={15} />
            {id === 'downloads' && pendingDownloads > 0 && <span className="badge">{pendingDownloads}</span>}
          </button>
        ))}
        </div>
      </div>
    )
  }

  /* ---- Expanded ---- */
  return (
    <div
      className="flex flex-col h-full relative z-20 flex-shrink-0 sidebar-gradient-animated"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        width: 248, minWidth: 248, maxWidth: 248, overflow: 'hidden',
      }}
    >
      <StarField />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="h-11 titlebar-drag flex-shrink-0" />

      {/* Header row */}
      <div className="flex items-center justify-between px-3 pb-2 no-drag flex-shrink-0">
        <WorkspaceSwitcher />
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--sidebar-text)' }} title="検索 (⌘K)"
          >
            <Search size={14} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--sidebar-text)' }} title="サイドバーを閉じる"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-0.5 px-2 pb-2 no-drag flex-shrink-0">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setSidebarPanel(id)}
            className={clsx(
              'flex items-center justify-center w-8 h-7 rounded-md text-xs transition-all relative',
              sidebarActivePanel === id
                ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text-active)] shadow-sm'
                : 'text-[var(--tab-text)] hover:bg-[var(--sidebar-hover)]'
            )}
            title={label}
          >
            <Icon size={14} />
            {id === 'downloads' && pendingDownloads > 0 && <span className="badge">{pendingDownloads}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setSidebarPanel('settings' as any)}
          className={clsx(
            'flex items-center justify-center w-8 h-7 rounded-md transition-all',
            (sidebarActivePanel as string) === 'settings'
              ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text-active)]'
              : 'text-[var(--tab-text)] hover:bg-[var(--sidebar-hover)]'
          )}
          title="設定"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Quick actions - bottom buttons like Arc */}
      <div className="flex items-center justify-around px-3 py-2 no-drag flex-shrink-0"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <button
          onClick={() => (window as any).__openLittleArc?.()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors"
          style={{ color: 'var(--tab-text)' }} title="Little Arc (⌘⇧N)"
        >
          <Wind size={14} />
        </button>
        <button
          onClick={() => (window as any).__triggerScreenshot?.()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors"
          style={{ color: 'var(--tab-text)' }} title="スクリーンショット (⌘⇧4)"
        >
          <Camera size={14} />
        </button>
        <button
          onClick={() => (window as any).__openLibrary?.()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors"
          style={{ color: 'var(--tab-text)' }} title="ライブラリ (⌘⇧L)"
        >
          <FolderOpen size={14} />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden no-drag">
        <AnimatePresence mode="wait">
          {sidebarActivePanel === 'tabs' && (
            <motion.div key="tabs"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.08 }}
              className="h-full flex flex-col"
            >
              {/* Pinned tabs */}
              {pinnedTabs.length > 0 && (
                <div className="px-2 pb-2 flex-shrink-0">
                  <div className="section-header mb-1.5">固定</div>
                  <PinnedTabs tabs={pinnedTabs} />
                </div>
              )}

              {/* Regular tabs */}
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                <div className="section-header mb-1">
                  タブ
                  <span className="ml-1.5 font-normal normal-case tracking-normal opacity-60">
                    {unpinnedTabs.length}
                  </span>
                </div>
                <TabStackList />
              </div>

              {/* New Tab button — Arc-style bottom button */}
              <div className="px-2 pb-3 pt-1 flex-shrink-0">
                <button
                  onClick={() => openNewTab()}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs transition-all
                    hover:bg-[var(--sidebar-active)] active:scale-[0.98]"
                  style={{ color: 'var(--tab-text)' }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                  >
                    <Plus size={11} />
                  </div>
                  <span>新しいタブ</span>
                  <span className="ml-auto opacity-40 text-[10px]">⌘T</span>
                </button>
              </div>
            </motion.div>
          )}

          {sidebarActivePanel === 'bookmarks' && (
            <motion.div key="bookmarks"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.08 }}
              className="h-full"
            ><BookmarksPanel /></motion.div>
          )}

          {sidebarActivePanel === 'history' && (
            <motion.div key="history"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.08 }}
              className="h-full"
            ><HistoryPanel /></motion.div>
          )}

          {sidebarActivePanel === 'downloads' && (
            <motion.div key="downloads"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.08 }}
              className="h-full"
            ><DownloadsPanel /></motion.div>
          )}

          {(sidebarActivePanel as string) === 'settings' && (
            <motion.div key="settings"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.08 }}
              className="h-full"
            ><SettingsPanel /></motion.div>
          )}

          {(sidebarActivePanel as string) === 'webpanel' && (
            <motion.div key="webpanel"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.08 }}
              className="h-full"
            ><WebPanel /></motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* System Stats */}
      <div className="flex-shrink-0 no-drag pb-1">
        <SystemStats />
      </div>
      </div>
    </div>
  )
}
