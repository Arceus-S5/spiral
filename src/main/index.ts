import fs from 'fs'
import path from 'path'
import { app, BrowserWindow, ipcMain, session, shell, protocol, globalShortcut, webContents } from 'electron'
import Store from 'electron-store'
import { TabManager } from './TabManager'
import { WindowManager } from './WindowManager'
import { DownloadManager } from './DownloadManager'
import { ExtensionManager } from './ExtensionManager'
import { BlocklistManager } from './BlocklistManager'
import { AutoUpdater } from './AutoUpdater'
import { BrowserSettings } from '../shared/types'

// ============================================================
// Main Process Entry Point
// ============================================================

const isDev = process.env.NODE_ENV === 'development'

// macOS向け設定
app.commandLine.appendSwitch('disable-web-security', 'false')
app.commandLine.appendSwitch('enable-features', 'CSSGridLayout,WebAnimations')
app.commandLine.appendSwitch('enable-smooth-scrolling')

// シングルインスタンス
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

// ストア初期化
const store = new Store<{ settings: BrowserSettings }>({
  defaults: {
    settings: {
      theme: 'sakura',
      sidebarWidth: 240,
      showBookmarksBar: false,
      defaultSearchEngine: {
        id: 'google',
        name: 'Google',
        url: 'https://www.google.com/search?q=%s',
        keyword: 'g',
        isDefault: true
      },
      customSearchEngines: [],
      adBlockEnabled: true,
      trackerBlockEnabled: true,
      cookiePolicy: 'block-third-party',
      hardwareAcceleration: true,
      smoothScrolling: true,
      defaultDownloadPath: app.getPath('downloads'),
      askDownloadLocation: true,
      startupPage: 'new-tab',
      fontSettings: {
        defaultSize: 16,
        minimumSize: 10,
        serif: 'Georgia',
        sansSerif: '-apple-system',
        monospace: 'SF Mono'
      },
      zoomLevel: 1.0,
      privateMode: false,
      splitViewEnabled: false,
      splitViewLayout: 'horizontal',
      shortcuts: {
        newTab: 'CmdOrCtrl+T',
        closeTab: 'CmdOrCtrl+W',
        reloadTab: 'CmdOrCtrl+R',
        commandPalette: 'CmdOrCtrl+K',
        focusAddressBar: 'CmdOrCtrl+L',
        toggleSidebar: 'CmdOrCtrl+\\',
        privateTab: 'CmdOrCtrl+Shift+N',
        zoomIn: 'CmdOrCtrl+Plus',
        zoomOut: 'CmdOrCtrl+Minus',
        zoomReset: 'CmdOrCtrl+0',
        devTools: 'CmdOrCtrl+Alt+I',
      },
      tabBehavior: {
        doubleClickToClose: true,
        middleClickToClose: true,
        closeTabOnSwipeLeft: false,
        switchTabOnScroll: true,
        confirmBeforeClose: false,
        restoreLastSession: false,
        openLinkInBackground: false,
        showTabPreviewOnHover: true,
      }
    }
  }
})

let windowManager: WindowManager
let tabManager: TabManager
let downloadManager: DownloadManager
let extensionManager: ExtensionManager
let blocklistManager: BlocklistManager
let autoUpdaterInstance: AutoUpdater

async function initialize() {
  // 共有セッション（persist:default）の設定 - Googleログイン等を維持
  const defaultSession = session.fromPartition('persist:default')

  // パーミッションを許可（通知、マイク、カメラ等）
  defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Slackに必要: 通知、クリップボード、メディアデバイス等
    const blockedPermissions = ['midi', 'midiSysex']
    callback(!blockedPermissions.includes(permission))
  })
  defaultSession.setPermissionCheckHandler(() => true)

  // User-Agentを最新Chromeに設定（Slackがサポートするバージョン）
  defaultSession.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  )

  // macOS向けセキュリティ設定（デフォルトセッション用）
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // ほとんどのパーミッションを許可（OAuthやサイト機能のため）
    const blockedPermissions = ['midi', 'midiSysex']
    callback(!blockedPermissions.includes(permission))
  })

  // webviewのセッションもパーミッションを許可
  session.defaultSession.setPermissionCheckHandler(() => true)

  // 広告ブロック・トラッカーブロック
  blocklistManager = new BlocklistManager()
  await blocklistManager.initialize()

  const settings = store.get('settings')
  
  if (settings.adBlockEnabled || settings.trackerBlockEnabled) {
    // Slack・Googleなど重要サービスのドメインはブロックしない
    const whitelistedDomains = [
      'slack.com', 'slack-edge.com', 'slack-imgs.com', 'slack-redir.net',
      'google.com', 'googleapis.com', 'gstatic.com', 'accounts.google.com',
      'googleusercontent.com',
    ]
    const blockHandler = (details: Electron.OnBeforeRequestListenerDetails, callback: (response: Electron.CallbackResponse) => void) => {
      try {
        const url = new URL(details.url)
        const isWhitelisted = whitelistedDomains.some(d => url.hostname.endsWith(d))
        if (isWhitelisted) {
          callback({ cancel: false })
          return
        }
      } catch {}
      const shouldBlock = blocklistManager.shouldBlock(details.url, {
        adBlock: settings.adBlockEnabled,
        trackerBlock: settings.trackerBlockEnabled
      })
      callback({ cancel: shouldBlock })
    }
    session.defaultSession.webRequest.onBeforeRequest(blockHandler)
    defaultSession.webRequest.onBeforeRequest(blockHandler)
  }

  // YouTubeバックグラウンドプレイヤー初期化

  // マネージャー初期化
  extensionManager = new ExtensionManager()

  // バンドル拡張機能を自動インストール
  const bundledExtDir = app.isPackaged
    ? path.join(process.resourcesPath, 'extensions')
    : path.join(__dirname, '../../extensions')

  if (fs.existsSync(bundledExtDir)) {
    const extFolders = fs.readdirSync(bundledExtDir)
    for (const folder of extFolders) {
      const extPath = path.join(bundledExtDir, folder)
      if (fs.statSync(extPath).isDirectory()) {
        extensionManager.install(extPath).catch(console.error)
      }
    }
  }
  downloadManager = new DownloadManager(store)
  tabManager = new TabManager()
  windowManager = new WindowManager(store, tabManager, downloadManager)
  autoUpdaterInstance = new AutoUpdater()

  // IPCハンドラー登録（ウィンドウ作成・renderer読み込みより前）
  setupIpcHandlers()
  tabManager.setupIpcHandlers(ipcMain)
  autoUpdaterInstance.setupIpcHandlers(ipcMain)

  // メインウィンドウ作成
  await windowManager.createMainWindow()

  // AutoUpdaterにウィンドウをセットして初期化（パッケージ済みのみ）
  const mainWin = windowManager.getMainWindow()
  if (mainWin && app.isPackaged) {
    autoUpdaterInstance.setMainWindow(mainWin)
    autoUpdaterInstance.initialize()
  }

  // グローバルショートカット（webviewがフォーカスを持っていても動作）
  globalShortcut.register('Command+B', () => {
    const win = windowManager.getMainWindow()
    if (win) win.webContents.send('global:toggleImmersive')
  })
  globalShortcut.register('Command+T', () => {
    const win = windowManager.getMainWindow()
    if (win) win.webContents.send('global:newTab')
  })
  globalShortcut.register('Command+W', () => {
    const win = windowManager.getMainWindow()
    if (win) win.webContents.send('global:closeTab')
  })
  globalShortcut.register('Command+L', () => {
    const win = windowManager.getMainWindow()
    if (win) win.webContents.send('global:focusUrlBar')
  })

  app.on('will-quit', () => globalShortcut.unregisterAll())
}

function setupIpcHandlers() {
  // Settings
  ipcMain.handle('settings:get', () => store.get('settings'))
  ipcMain.handle('settings:set', (_, settings: Partial<BrowserSettings>) => {
    const current = store.get('settings')
    store.set('settings', { ...current, ...settings })
    windowManager.broadcastToAll('settings:updated', store.get('settings'))
  })

  // Window controls
  // プライベートウィンドウ
  ipcMain.on('window:openPrivate', () => {
    const privateWin = new BrowserWindow({
      width: 1200, height: 800,
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, 'preload.js'),
        partition: 'private-' + Date.now(),
      },
      title: 'Spiral — Private',
    })
    privateWin.loadFile(path.join(__dirname, '../../index.html'))
  })

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
  ipcMain.on('window:toggleFullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.setFullScreen(!win.isFullScreen())
  })

  // External links
  ipcMain.on('shell:openExternal', (_, url: string) => {
    shell.openExternal(url)
  })

  // Downloads
  ipcMain.handle('download:getAll', () => downloadManager.getAll())
  ipcMain.on('download:cancel', (_, id: string) => downloadManager.cancel(id))
  ipcMain.on('download:show', (_, id: string) => downloadManager.showInFinder(id))
  ipcMain.on('download:clear', () => downloadManager.clearCompleted())

  // Bookmarks & History (データストア経由)
  ipcMain.handle('data:getBookmarks', () => store.get('bookmarks' as any, []))
  ipcMain.handle('data:setBookmarks', (_, bookmarks) => store.set('bookmarks' as any, bookmarks))
  ipcMain.handle('data:getHistory', () => store.get('history' as any, []))
  ipcMain.handle('data:setHistory', (_, history) => store.set('history' as any, history))
  ipcMain.handle('data:getWorkspaces', () => store.get('workspaces' as any, []))
  ipcMain.handle('data:setWorkspaces', (_, workspaces) => store.set('workspaces' as any, workspaces))
  ipcMain.handle('data:getTabs', () => store.get('tabs' as any, null))
  ipcMain.handle('data:setTabs', (_, tabs) => store.set('tabs' as any, tabs))
  ipcMain.handle('data:getQuickLinks', () => store.get('quickLinks' as any, null))
  ipcMain.handle('data:setQuickLinks', (_, links) => store.set('quickLinks' as any, links))

  // パスワード保存
  ipcMain.handle('passwords:getAll', () => store.get('passwords' as any, []))
  ipcMain.handle('passwords:save', (_, entry) => {
    const passwords: any[] = store.get('passwords' as any, [])
    const existing = passwords.findIndex((p: any) => p.domain === entry.domain && p.username === entry.username)
    if (existing >= 0) {
      passwords[existing] = { ...passwords[existing], ...entry, updatedAt: Date.now() }
    } else {
      passwords.push({ ...entry, id: require('crypto').randomUUID(), createdAt: Date.now() })
    }
    store.set('passwords' as any, passwords)
    return passwords
  })
  ipcMain.handle('passwords:delete', (_, id) => {
    const passwords: any[] = store.get('passwords' as any, [])
    const filtered = passwords.filter((p: any) => p.id !== id)
    store.set('passwords' as any, filtered)
    return filtered
  })

  // Extensions
  ipcMain.handle('extension:getAll', () => extensionManager.getAll())
  ipcMain.on('extension:toggle', (_, id: string, enabled: boolean) => {
    extensionManager.toggle(id, enabled)
  })

  // 強制ダークモード: TabManager経由で全タブに適用（新規タブにも自動適用）
  ipcMain.on('settings:forceDarkMode', (_, enabled: boolean) => {
    store.set('settings.forceDarkMode', enabled)
    tabManager.setForceDarkMode(enabled)
    // 既存の全webviewに即時適用
    webContents.getAllWebContents().forEach(wc => {
      if (wc.getType() === 'webview') {
        if (enabled) {
          wc.insertCSS(`
            :root { color-scheme: dark !important; }
            html, body { background-color: #1a1a1a !important; color: #e8e8e8 !important; }
            [style*="background-color: rgb(255, 255, 255)"],
            [style*="background-color: white"],
            [style*="background: white"] { background-color: #242424 !important; }
            [style*="background-color: rgb(248"],[style*="background-color: rgb(249"],
            [style*="background-color: rgb(250"],[style*="background-color: rgb(251"],
            [style*="background-color: rgb(252"],[style*="background-color: rgb(253"],
            [style*="background-color: rgb(254"] { background-color: #1e1e1e !important; }
            input, textarea, select { background-color: #2a2a2a !important; color: #e8e8e8 !important; border-color: #444 !important; }
            a:not([style*="color"]) { color: #7ab3f0 !important; }
          `).catch(() => {})
        }
      }
    })
  })

  // システム情報: CPU使用率
  // デフォルトブラウザに設定
  ipcMain.handle('app:setAsDefaultBrowser', () => {
    app.setAsDefaultProtocolClient('http')
    app.setAsDefaultProtocolClient('https')
    return true
  })

  ipcMain.handle('system:getCpuUsage', async () => {
    try {
      const cpuUsage = process.getCPUUsage()
      return Math.min(100, Math.round(cpuUsage.percentCPUUsage))
    } catch {
      return 0
    }
  })
}

// App lifecycle
app.whenReady().then(initialize)

app.on('window-all-closed', () => {
  // バックグラウンドセッションが残っている場合はアプリを終了しない
  if (process.platform !== 'darwin') {
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow()
  }
})

app.on('second-instance', () => {
  const mainWindow = windowManager.getMainWindow()
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// セキュリティ: navigationを制限
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:' &&
        parsedUrl.protocol !== 'file:' && parsedUrl.protocol !== 'chrome-extension:') {
      event.preventDefault()
    }
  })

  contents.setWindowOpenHandler(({ url }) => {
    // 新しいウィンドウは内部で処理
    tabManager.createTabInMainWindow(url)
    return { action: 'deny' }
  })
})
