import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, RotateCw, Globe,
  Lock, BookmarkPlus, BookmarkCheck, Layout, X, VolumeX, Volume2, PictureInPicture2
} from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate } from '../../hooks/useIpc'
import { WebViewContainer } from './WebViewContainer'
import { NewTabPage } from './NewTabPage'
import { SplitView } from './SplitView'

export function BrowserArea() {
  const tabs = useBrowserStore(s => s.tabs)
  const activeTabId = useBrowserStore(s => s.activeTabId)
  const splitView = useBrowserStore(s => s.splitView)
  const setSplitView = useBrowserStore(s => s.setSplitView)
  const isFullscreen = useBrowserStore(s => s.isFullscreen)
  const browserTabs = tabs // display:noneでなくvisibilityで制御するので全タブ保持
  const activeTab = tabs.find(t => t.id === activeTabId) || null
  const showNewTab = !activeTab || !activeTab.url || activeTab.url === 'about:newtab'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!isFullscreen && <Toolbar />}

      <div
        className="flex-1 overflow-hidden relative"
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'link' }}
        onDrop={e => {
          const droppedTabId = e.dataTransfer.getData('tabId')
          if (droppedTabId && droppedTabId !== activeTabId && !splitView) {
            const primary = activeTabId
            if (primary) {
              setSplitView({ enabled: true, layout: 'horizontal', primaryTabId: primary, secondaryTabId: droppedTabId, splitRatio: 0.5 })
            }
          }
        }}
      >
        {splitView ? (
          <SplitView config={splitView} />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ display: showNewTab ? 'block' : 'none', zIndex: showNewTab ? 1 : 0 }}
            >
              <NewTabPage />
            </div>
            {browserTabs.map(tab => (
              <div
                key={tab.id}
                className="absolute inset-0"
                style={{
                  // display:none だとwebviewが停止するため visibility で隠す
                  // これにより非アクティブタブのJSも動き続け通知が届く
                  visibility: tab.id === activeTabId && !showNewTab ? 'visible' : 'hidden',
                  zIndex: tab.id === activeTabId ? 1 : 0,
                  pointerEvents: tab.id === activeTabId && !showNewTab ? 'auto' : 'none',
                }}
              >
                <WebViewContainer tabId={tab.id} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Toolbar() {
  const store = useBrowserStore()
  const {
    tabs, activeTabId, addBookmark, bookmarks, removeBookmark,
    splitView, setSplitView, splitFocusedTabId,
    mutedSites, toggleMuteSite, isSiteMuted,
  } = store
  const { navigate, goBack, goForward, reload } = useNavigate()
  const targetTabId = splitView && splitFocusedTabId ? splitFocusedTabId : activeTabId
  const activeTab = tabs.find(t => t.id === targetTabId) || null

  const [urlValue, setUrlValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const displayUrl = isFocused
    ? urlValue
    : (activeTab?.url || '')
  const isBookmarked = activeTab ? bookmarks.some(b => b.url === activeTab.url) : false
  const isSecure = activeTab?.url?.startsWith('https://')
  const isLoading = activeTab?.isLoading
  const isNewTab = false

  const activeHostname = (() => { try { return activeTab?.url ? new URL(activeTab.url).hostname : '' } catch { return '' } })(  )
  const isMuted = activeHostname ? isSiteMuted(activeHostname) : false

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    setUrlValue(activeTab?.url || '')
    setTimeout(() => e.target.select(), 50)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlValue.trim()) return
    navigate(urlValue.trim(), targetTabId || undefined)
    ;(document.activeElement as HTMLElement)?.blur()
  }

  const handleBookmark = () => {
    if (!activeTab || isNewTab) return
    if (isBookmarked) {
      const bm = bookmarks.find(b => b.url === activeTab.url)
      if (bm) removeBookmark(bm.id)
    } else {
      addBookmark({ url: activeTab.url, title: activeTab.title || activeTab.url })
    }
  }

  const handleSplit = () => {
    if (splitView) {
      setSplitView(null)
      return
    }
    const other = tabs.find(t => t.id !== activeTab?.id)
    if (activeTab && other) {
      setSplitView({ enabled: true, layout: 'horizontal', primaryTabId: activeTab.id, secondaryTabId: other.id, splitRatio: 0.5 })
    } else if (activeTab) {
      // タブが1つ→新規タブを作ってから分割（addTabの戻り値を使う）
      const newTab = store.addTab({ url: 'https://www.google.com', title: 'Google' })
      setSplitView({ enabled: true, layout: 'horizontal', primaryTabId: activeTab.id, secondaryTabId: newTab.id, splitRatio: 0.5 })
    }
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 flex-shrink-0 titlebar-drag"
      style={{
        background: 'var(--sidebar-bg)',
        borderBottom: 'none',
        boxShadow: 'none',
        height: 46,
      }}
    >
      {/* Traffic lights space */}
      <div className="w-16 flex-shrink-0" />

      {/* Nav buttons */}
      <div className="flex items-center gap-0.5 no-drag">
        <NavBtn
          onClick={() => goBack(targetTabId || undefined)}
          disabled={!activeTab?.canGoBack}
          title="戻る (⌘[)"
        >
          <ChevronLeft size={17} strokeWidth={2.2} />
        </NavBtn>
        <NavBtn
          onClick={() => goForward(targetTabId || undefined)}
          disabled={!activeTab?.canGoForward}
          title="進む (⌘])"
        >
          <ChevronRight size={17} strokeWidth={2.2} />
        </NavBtn>
        <NavBtn onClick={() => reload(targetTabId || undefined)} title={isLoading ? '停止' : 'リロード (⌘R)'}>
          {isLoading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
              <RotateCw size={14} />
            </motion.div>
          ) : <RotateCw size={14} />}
        </NavBtn>
      </div>

      {/* URL bar — Arc style: centered, pill-shaped */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 no-drag max-w-2xl mx-auto">
        <div
          className="url-bar"
          style={{ cursor: 'text' }}
          onClick={e => {
            const input = (e.currentTarget as HTMLElement).querySelector('input')
            input?.focus()
          }}
        >
          {/* Security icon */}
          <div className="flex-shrink-0 flex items-center" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
                <RotateCw size={11} />
              </motion.div>
            ) : isSecure ? (
              <Lock size={11} className="text-emerald-500" />
            ) : (
              <Globe size={11} />
            )}
          </div>

          <input
            data-url-bar
            type="text"
            value={displayUrl}
            onChange={e => setUrlValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => setIsFocused(false)}
            placeholder="検索またはURLを入力"
            className="flex-1 bg-transparent outline-none text-sm min-w-0 text-center"
            style={{ color: 'var(--text-primary)' }}
            spellCheck={false}
            autoComplete="off"
          />

          {/* Mute button */}
          {!isNewTab && activeHostname && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggleMuteSite(activeHostname) }}
              className="flex-shrink-0 transition-colors"
              title={isMuted ? 'ミュート解除' : 'このサイトをミュート'}
              style={{ color: isMuted ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          )}

          {/* Bookmark star */}
          {!isNewTab && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleBookmark() }}
              className="flex-shrink-0 transition-colors"
              style={{ color: isBookmarked ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            >
              {isBookmarked
                ? <BookmarkCheck size={13} />
                : <BookmarkPlus size={13} />}
            </button>
          )}
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-0.5 no-drag">
        <NavBtn
          onClick={() => {
            const tid = splitView && splitFocusedTabId ? splitFocusedTabId : activeTabId
            const wv = document.querySelector<Electron.WebviewTag>(`webview[data-tabid="${tid}"]`)
            if (!wv) return
            wv.executeJavaScript(`
              (function() {
                const v = [...document.querySelectorAll('video')].find(v => !v.paused && v.readyState >= 2) || document.querySelector('video')
                if (!v) return
                if (document.pictureInPictureElement) { document.exitPictureInPicture().catch(()=>{}) }
                else { v.requestPictureInPicture().catch(e => console.warn('[PiP]', e.message)) }
              })()
            `).catch(() => {})
          }}
          title="Picture in Picture (Alt+P)"
        >
          <PictureInPicture2 size={14} />
        </NavBtn>
        <NavBtn
          onClick={handleSplit}
          disabled={!splitView && tabs.length < 2}
          title={splitView ? 'Split View解除' : tabs.length < 2 ? 'タブが2つ必要です' : 'Split View'}
        >
          {splitView ? <X size={14} /> : <Layout size={14} />}
        </NavBtn>
      </div>
    </div>
  )
}

function NavBtn({ onClick, disabled, title, children }: {
  onClick: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors
        hover:bg-[var(--sidebar-hover)] disabled:opacity-25 disabled:cursor-not-allowed"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}
