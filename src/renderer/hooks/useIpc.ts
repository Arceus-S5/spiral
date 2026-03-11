import { useEffect, useCallback, useRef, useState } from 'react'
import { useBrowserStore } from '../store/browserStore'

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
      send: (channel: string, ...args: any[]) => void
      on: (channel: string, listener: (...args: any[]) => void) => () => void
      once: (channel: string, listener: (...args: any[]) => void) => void
      platform: string
      versions: { electron: string; chrome: string; node: string }
    }
  }
}

// ============================================================
// useIpc - IPC通信フック
// ============================================================
export function useIpc() {
  const isElectron = !!window.electronAPI

  const invoke = useCallback(async (channel: string, ...args: any[]) => {
    if (!isElectron) return null
    return window.electronAPI.invoke(channel, ...args)
  }, [isElectron])

  const send = useCallback((channel: string, ...args: any[]) => {
    if (!isElectron) return
    window.electronAPI.send(channel, ...args)
  }, [isElectron])

  const on = useCallback((channel: string, listener: (...args: any[]) => void) => {
    if (!isElectron) return () => {}
    return window.electronAPI.on(channel, listener)
  }, [isElectron])

  return { invoke, send, on, isElectron }
}

// ============================================================
// useTabEvents - タブイベントリスナー
// ============================================================
export function useTabEvents() {
  const { on } = useIpc()
  const store = useBrowserStore()

  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      on('tab:created', ({ tabId, url, workspaceId, isPrivate }) => {
        // メインプロセスからタブ作成通知（実際のWebContentsViewと同期）
        console.log('Tab created in main process:', tabId)
      }),

      on('tab:titleUpdated', ({ tabId, title }) => {
        store.updateTab(tabId, { title })
      }),

      on('tab:faviconUpdated', ({ tabId, favicon }) => {
        store.updateTab(tabId, { favicon })
      }),

      on('tab:loadingChange', ({ tabId, isLoading }) => {
        store.updateTab(tabId, { isLoading })
      }),

      on('tab:urlUpdated', ({ tabId, url, canGoBack, canGoForward }) => {
        // about:blank はメインプロセスの初期化で送られてくるが、
        // rendererがすでにhttps://... を持っている場合は上書きしない
        if (url === 'about:blank') {
          const existing = store.tabs.find(t => t.id === tabId)
          if (existing?.url && existing.url !== 'about:blank' && existing.url !== 'about:newtab') {
            store.updateTab(tabId, { canGoBack, canGoForward })
            return
          }
        }
        store.updateTab(tabId, { url, canGoBack, canGoForward })
        if (url && url !== 'about:blank') {
          const tab = store.tabs.find(t => t.id === tabId)
          if (tab) {
            store.addHistoryEntry({ url, title: tab.title, favicon: tab.favicon })
          }
        }
      }),

      on('tab:closed', ({ tabId }) => {
        store.removeTab(tabId)
      }),

      on('download:started', (download) => {
        store.updateDownload(download.id, download)
      }),

      on('download:progress', (download) => {
        store.updateDownload(download.id, download)
      }),

      on('download:done', (download) => {
        store.updateDownload(download.id, download)
      }),

      on('settings:updated', (settings) => {
        store.setSettings(settings)
      }),

      on('theme:changed', ({ shouldUseDarkColors }) => {
        if (store.settings?.theme === 'system') {
          store.setTheme(shouldUseDarkColors ? 'dark' : 'light')
        }
      }),

      on('window:fullscreenChange', (isFullscreen: boolean) => {
        store.setFullscreen(isFullscreen)
      })
    )

    return () => {
      unsubscribers.forEach(fn => fn())
    }
  }, [])
}

// ============================================================
// useSettings - 設定の読み込み・保存
// ============================================================
export function useSettings() {
  const { invoke } = useIpc()
  const { setSettings } = useBrowserStore()

  useEffect(() => {
    invoke('settings:get').then((settings: any) => {
      if (settings) {
        setSettings(settings)
        // 強制ダークモードを起動時に自動復元
        if ((settings as any).forceDarkMode) {
          invoke('settings:forceDarkMode', true)
        }
      }
    })
  }, [])

  const updateSettings = useCallback(async (partial: any) => {
    await invoke('settings:set', partial)
  }, [invoke])

  return { updateSettings }
}

// ============================================================
// useNavigate - ナビゲーション
// ============================================================
export function useNavigate() {
  const { send, invoke } = useIpc()
  const store = useBrowserStore()

  const navigate = useCallback((url: string, tabId?: string) => {
    const tid = tabId || store.activeTabId
    if (!tid) return

    let normalizedUrl = url.trim()
    if (!normalizedUrl) return

    const isNewTab = normalizedUrl === 'about:blank'

    if (!isNewTab) {
      if (!normalizedUrl.startsWith('http://') &&
          !normalizedUrl.startsWith('https://') &&
          !normalizedUrl.startsWith('file://') &&
          !normalizedUrl.startsWith('about:')) {
        if (normalizedUrl.includes('.') && !normalizedUrl.includes(' ')) {
          normalizedUrl = 'https://' + normalizedUrl
        } else {
          normalizedUrl = 'https://www.google.com/search?q=' + encodeURIComponent(normalizedUrl)
        }
      }
    }

    // storeのURLを即座に更新してwebviewをマウントさせる
    store.updateTab(tid, {
      url: isNewTab ? 'https://www.google.com' : normalizedUrl,
      isLoading: true,
    })

    send('tab:navigate', { tabId: tid, url: normalizedUrl })
  }, [send, store])

  // webviewタグを取得するヘルパー（data-tabid属性で特定）
  const getWebview = useCallback((tabId?: string): Electron.WebviewTag | null => {
    const tid = tabId || store.activeTabId
    if (!tid) return null
    return document.querySelector<Electron.WebviewTag>(`webview[data-tabid="${tid}"]`)
  }, [store])

  const goBack = useCallback((tabId?: string) => {
    const wv = getWebview(tabId)
    if (wv && wv.canGoBack()) {
      wv.goBack()
    } else {
      // フォールバック: mainプロセス経由
      const tid = tabId || store.activeTabId
      if (tid) send('tab:goBack', { tabId: tid })
    }
  }, [getWebview, send, store])

  const goForward = useCallback((tabId?: string) => {
    const wv = getWebview(tabId)
    if (wv && wv.canGoForward()) {
      wv.goForward()
    } else {
      const tid = tabId || store.activeTabId
      if (tid) send('tab:goForward', { tabId: tid })
    }
  }, [getWebview, send, store])

  const reload = useCallback((tabId?: string, ignoreCache = false) => {
    const wv = getWebview(tabId)
    if (wv) {
      if (ignoreCache) wv.reloadIgnoringCache()
      else wv.reload()
    } else {
      const tid = tabId || store.activeTabId
      if (tid) send('tab:reload', { tabId: tid, ignoreCache })
    }
  }, [getWebview, send, store])

  const openNewTab = useCallback((url?: string, workspaceId?: string) => {
    const wsId = workspaceId || store.activeWorkspaceId
    const resolvedUrl = url || 'https://www.google.com'
    const tab = store.addTab({ url: resolvedUrl, workspaceId: wsId })
    invoke('tab:create', { url: resolvedUrl, workspaceId: wsId }).catch(() => {})
    return tab
  }, [invoke, store])

  const closeTab = useCallback((tabId: string) => {
    store.removeTab(tabId)
    send('tab:close', { tabId })
  }, [send, store])

  return { navigate, goBack, goForward, reload, openNewTab, closeTab }
}

// ============================================================
// useKeyboardShortcuts - キーボードショートカット
// ============================================================
export function useKeyboardShortcuts() {
  const store = useBrowserStore()
  const { openNewTab, closeTab, navigate, goBack, goForward, reload } = useNavigate()
  const { send } = useIpc()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey

      // Command Palette: Cmd+K
      if (cmd && e.key === 'k') {
        e.preventDefault()
        store.setCommandPaletteOpen(!store.commandPaletteOpen)
        return
      }

      // New Tab: Cmd+T
      if (cmd && e.key === 't' && !e.shiftKey) {
        e.preventDefault()
        openNewTab()
        return
      }

      // Close Tab: Cmd+W
      if (cmd && e.key === 'w') {
        e.preventDefault()
        if (store.activeTabId) closeTab(store.activeTabId)
        return
      }

      // Reload: Cmd+R
      if (cmd && e.key === 'r') {
        e.preventDefault()
        reload(undefined, e.shiftKey)
        return
      }

      // Focus URL bar: Cmd+L
      if (cmd && e.key === 'l') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-url-bar]')?.focus()
        document.querySelector<HTMLInputElement>('[data-url-bar]')?.select()
        return
      }

      // Toggle Sidebar: Cmd+\
      if (cmd && e.key === '\\') {
        e.preventDefault()
        store.setSidebarCollapsed(!store.sidebarCollapsed)
        return
      }

      // Go Back: Cmd+[
      if (cmd && e.key === '[') {
        e.preventDefault()
        goBack()
        return
      }

      // Go Forward: Cmd+]
      if (cmd && e.key === ']') {
        e.preventDefault()
        goForward()
        return
      }

      // Little Arc: Cmd+Shift+N
      if (cmd && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        ;(window as any).__openLittleArc?.()
        return
      }

      // Private Window: Cmd+Shift+P
      if (cmd && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        send('window:openPrivate')
        return
      }

      // Screenshot: Cmd+Shift+4
      if (cmd && e.shiftKey && e.key === '4') {
        e.preventDefault()
        ;(window as any).__triggerScreenshot?.()
        return
      }

      // Library: Cmd+Shift+L
      if (cmd && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault()
        ;(window as any).__openLibrary?.()
        return
      }

      // Dev Tools: Cmd+Opt+I
      if (cmd && e.altKey && e.key === 'i') {
        e.preventDefault()
        if (store.activeTabId) {
          send('tab:toggleDevTools', { tabId: store.activeTabId })
        }
        return
      }

      // Zoom In: Cmd+=
      if (cmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        // zoom handled by browser
        return
      }

      // Tab switching: Cmd+1~9
      if (cmd && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        const wsTabIds = store.getUnpinnedTabs().map(t => t.id)
        if (wsTabIds[idx]) {
          store.setActiveTab(wsTabIds[idx])
          send('tab:setActive', { tabId: wsTabIds[idx] })
        }
        return
      }

      // Escape: Close command palette
      if (e.key === 'Escape' && store.commandPaletteOpen) {
        store.setCommandPaletteOpen(false)
        return
      }

      // Cmd+B: 没入モード（UI全非表示）
      if (cmd && e.key === 'b') {
        e.preventDefault()
        store.setFullscreen(!store.isFullscreen)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [store, openNewTab, closeTab, reload, goBack, goForward, send])
}

// 自動アップデートフック
export function useAutoUpdater() {
  const { on, invoke } = useIpc()
  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'upToDate'
    version?: string
    percent?: number
    error?: string
  }>({ status: 'idle' })

  useEffect(() => {
    on('updater:checking', () => setUpdateState({ status: 'checking' }))
    on('updater:updateAvailable', (info: any) =>
      setUpdateState({ status: 'available', version: info.version }))
    on('updater:upToDate', () => setUpdateState({ status: 'upToDate' }))
    on('updater:downloadProgress', (p: any) =>
      setUpdateState(s => ({ ...s, status: 'downloading', percent: p.percent })))
    on('updater:updateDownloaded', (info: any) =>
      setUpdateState({ status: 'downloaded', version: info.version }))
    on('updater:error', (e: any) =>
      setUpdateState({ status: 'error', error: e.message }))
  }, [])

  const checkForUpdates = useCallback(() => {
    invoke('updater:checkForUpdates').catch(() => {})
  }, [invoke])

  const downloadUpdate = useCallback(() => {
    invoke('updater:downloadUpdate').catch(() => {})
  }, [invoke])

  const installAndRestart = useCallback(() => {
    invoke('updater:installAndRestart').catch(() => {})
  }, [invoke])

  return { updateState, checkForUpdates, downloadUpdate, installAndRestart }
}
