import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBrowserStore } from './store/browserStore'
import { useTabEvents, useSettings, useKeyboardShortcuts, useIpc } from './hooks/useIpc'
import { Sidebar } from './components/sidebar/Sidebar'
import { BrowserArea } from './components/browser/BrowserArea'
import { CommandPalette } from './components/commandpalette/CommandPalette'
import { LittleArcContainer } from './components/browser/LittleArc'
import { ScreenshotTool } from './components/browser/Screenshot'
import { Library } from './components/browser/Library'
import { LinkPreviewOverlay } from './components/browser/LinkPreview'
import { PopupVideoManager } from './components/browser/PopupVideo'
import { DownloadNotification } from './components/browser/DownloadNotification'
import { MouseGestureOverlay } from './components/browser/MouseGesture'
import { QuickNoteOverlay } from './components/browser/QuickNote'

export default function App() {
  const { theme, settings, commandPaletteOpen, isFullscreen } = useBrowserStore()

  // Initialize
  useTabEvents()
  useSettings()
  useKeyboardShortcuts()
  // タブ永続化: 起動時に復元、終了時に保存
  const { invoke, isElectron } = useIpc()
  const store = useBrowserStore()
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const tabsInitialized = useRef(false)
  const [tabsReady, setTabsReady] = useState(false)

  // グローバル関数でオーバーレイを開く
  useEffect(() => {
    ;(window as any).__triggerScreenshot = () => setShowScreenshot(true)
    ;(window as any).__openLibrary = () => setShowLibrary(true)
    return () => {
      delete (window as any).__triggerScreenshot
      delete (window as any).__openLibrary
    }
  }, [])

  useEffect(() => {
    if (!isElectron || tabsInitialized.current) return
    tabsInitialized.current = true

    // 起動時: 保存されたタブとクイックリンクを復元
    invoke('data:getTabs').then((saved: any) => {
      if (saved && saved.tabs && saved.tabs.length > 0) {
        const { activeTabId, pinnedTabIds, tabGroups } = saved
        const tabs = saved.tabs.map((t: any) =>
          (t.url === 'about:blank' || t.url === 'about:newtab')
            ? { ...t, url: 'https://www.google.com', title: 'Google' }
            : t
        )
        store.loadPersistedTabs({ tabs, activeTabId, pinnedTabIds: pinnedTabIds || [], tabGroups: tabGroups || [] })
      }
      setTabsReady(true)
    }).catch(() => setTabsReady(true))

    invoke('data:getQuickLinks').then((saved: any) => {
      if (saved && Array.isArray(saved) && saved.length > 0) {
        store.loadPersistedQuickLinks(saved)
      }
    })
  }, [isElectron])

  // タブ変化時に保存（デバウンス）
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isElectron) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const { tabs, activeTabId, pinnedTabIds, tabGroups } = store
      // プライベートタブは保存しない
      const tabsToSave = tabs.filter(t => !t.isPrivate)
      invoke('data:setTabs', { tabs: tabsToSave, activeTabId, pinnedTabIds, tabGroups })
    }, 500)
  }, [store.tabs, store.activeTabId, store.pinnedTabIds, store.tabGroups])

  // クイックリンク変化時に保存
  const qlTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isElectron) return
    if (qlTimer.current) clearTimeout(qlTimer.current)
    qlTimer.current = setTimeout(() => {
      invoke('data:setQuickLinks', store.quickLinks)
    }, 500)
  }, [store.quickLinks])

  // グローバルショートカット（webview内でも動作）
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return
    const r1 = api.on('global:toggleImmersive', () => store.setFullscreen(!store.isFullscreen))
    const r2 = api.on('global:newTab', () => {
      // openNewTab は useNavigate 内なのでここでは直接storeを操作
      store.addTab({ url: 'https://www.google.com', title: 'Google' })
    })
    const r3 = api.on('global:closeTab', () => {
      if (store.activeTabId) store.removeTab(store.activeTabId)
    })
    const r4 = api.on('global:focusUrlBar', () => {
      store.setFullscreen(false) // 没入モードを解除してURLバーを表示
      setTimeout(() => {
        document.querySelector<HTMLInputElement>('[data-url-bar]')?.focus()
        document.querySelector<HTMLInputElement>('[data-url-bar]')?.select()
      }, 50)
    })
    return () => { r1?.(); r2?.(); r3?.(); r4?.() }
  }, [store.isFullscreen])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark', 'theme-midnight', 'theme-rose', 'theme-sakura', 'theme-solarized', 'theme-custom')

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(isDark ? 'theme-dark' : 'theme-light')
    } else if (theme !== 'system') {
      root.classList.add(`theme-${theme}`)
    }

    // Custom CSS
    const customStyle = document.getElementById('custom-css') || document.createElement('style')
    customStyle.id = 'custom-css'
    if (settings?.customTheme?.customCSS) {
      customStyle.textContent = settings.customTheme.customCSS
    }
    if (!document.getElementById('custom-css')) {
      document.head.appendChild(customStyle)
    }
  }, [theme, settings?.customTheme])

  return (
    <>
      <div
        className="flex w-full h-full overflow-hidden"
        style={{ background: 'var(--browser-bg)' }}
      >
        {/* Sidebar — 没入モード時は非表示 */}
        <AnimatePresence>
          {!isFullscreen && <Sidebar />}
        </AnimatePresence>

        {/* Main Browser Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* tabsReadyをkeyにしてタブ復元後に確実に再マウント */}
          <BrowserArea key={tabsReady ? 'ready' : 'init'} />
        </div>

        {/* Command Palette */}
        <AnimatePresence>
          {commandPaletteOpen && <CommandPalette />}
        </AnimatePresence>

        {/* Download Notification */}
        <DownloadNotification />

        {/* Quick Note floating overlay */}
        <QuickNoteOverlay />
      </div>

      {/* Floating overlays */}
      <LittleArcContainer />
      <PopupVideoManager />
      <MouseGestureOverlay />
      <LinkPreviewOverlay />
      <AnimatePresence>
        {showScreenshot && <ScreenshotTool onClose={() => setShowScreenshot(false)} />}
        {showLibrary && <Library onClose={() => setShowLibrary(false)} />}
      </AnimatePresence>
    </>
  )
}
