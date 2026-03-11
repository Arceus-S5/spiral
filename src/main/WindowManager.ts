import { BrowserWindow, nativeTheme, screen, session, BrowserWindowConstructorOptions } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { TabManager } from './TabManager'
import { DownloadManager } from './DownloadManager'

const isDev = process.env.NODE_ENV === 'development'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private windows: Set<BrowserWindow> = new Set()

  constructor(
    private store: Store<any>,
    private tabManager: TabManager,
    private downloadManager: DownloadManager
  ) {}

  async createMainWindow(): Promise<BrowserWindow> {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    this.mainWindow = new BrowserWindow({
      width: Math.min(1400, width),
      height: Math.min(900, height),
      minWidth: 800,
      minHeight: 600,
      titleBarStyle: 'hiddenInset', // macOS向け: トラフィックライト統合
      trafficLightPosition: { x: 16, y: 16 },
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#f0eefb',
      transparent: false,
      roundedCorners: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, 'preload.js'),
        webviewTag: true,
        devTools: true,
        spellcheck: true,
        webSecurity: false, // webviewからのリクエストを許可
      },
      icon: path.join(__dirname, '../../public/icon.icns'),
    })

    // ダウンロード処理
    this.mainWindow.webContents.session.on('will-download', (event, item) => {
      this.downloadManager.handleDownload(item, this.mainWindow!)
    })

    // webviewのセッション設定（全partitionに適用）
    // GoogleのOAuth等のポップアップを許可
    this.mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
      const applyDarkMode = () => {
        const enabled = (this.store as any).get('settings.forceDarkMode', false)
        if (!enabled) return
        webContents.insertCSS(`
          :root { color-scheme: dark !important; }
          html { background: #141414 !important; }
          body { background-color: #141414 !important; color: #e2e2e2 !important; }
          .RNNXgb,.SDkEP,.sfbg,.A8SBwf,.gLFyf,.FPdoLc,.o3j99,.K7sJDb,.HiHjCd,
          #searchform,#tsf,.tsf-p,[role="search"] {
            background-color: #1e1e1e !important; border-color: #333 !important;
          }
          input[type="text"],input[type="search"],input[name="q"],textarea,.gLFyf {
            background-color: #2a2a2a !important; color: #e2e2e2 !important; caret-color: #fff !important;
          }
          ul[role="listbox"],[role="option"],.aajZCb,.erkvQe,.sbsb_a,.sbtc {
            background-color: #1e1e1e !important; color: #e2e2e2 !important; border-color: #333 !important;
          }
          #gb,.gb_oe,[role="banner"],[role="navigation"],header,nav,#top_nav,.appbar {
            background-color: #1a1a1a !important; border-bottom-color: #2a2a2a !important;
          }
          [style*="background:#fff"],[style*="background: #fff"],
          [style*="background:white"],[style*="background: white"],
          [style*="background-color:#fff"],[style*="background-color: #fff"],
          [style*="background-color: white"],[style*="background-color:white"],
          [style*="background-color: rgb(255, 255, 255)"],
          [style*="background-color:rgb(255,255,255)"] {
            background-color: #1e1e1e !important;
          }
          [style*="color:#000"],[style*="color: #000"],[style*="color:black"],[style*="color: black"],
          [style*="color:#333"],[style*="color: #333"],[style*="color: rgb(0, 0, 0)"] {
            color: #e2e2e2 !important;
          }
          a { color: #7eb8f7 !important; }
          a:visited { color: #c4a0f5 !important; }
          .LC20lb,.DKV0Md { color: #8ab4f8 !important; }
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: #1a1a1a; }
          ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }
        `).catch(() => {})
      }

      webContents.setBackgroundThrottling(false)

      webContents.on('did-finish-load', applyDarkMode)
      webContents.on('did-navigate', applyDarkMode)
      webContents.on('did-navigate-in-page', applyDarkMode)

      // ポップアップウィンドウ（OAuth等）をメインウィンドウで開く
      webContents.setWindowOpenHandler(({ url }) => {
        // OAuth認証URLはポップアップで開く
        const isAuthUrl = url.includes('accounts.google.com') ||
          url.includes('login') || url.includes('oauth') ||
          url.includes('auth') || url.includes('signin') ||
          url.includes('connect') || url.includes('authorize') ||
          url.includes('slack.com/sign') || url.includes('slack.com/oauth')

        if (isAuthUrl) {
          // 小さなポップアップウィンドウとして開く
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              width: 500,
              height: 650,
              parent: this.mainWindow!,
              modal: false,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                partition: 'persist:default', // 共有セッションでGoogleログインを維持
              }
            } as BrowserWindowConstructorOptions
          }
        }

        // その他の新規ウィンドウは同じwebviewで開く
        webContents.loadURL(url)
        return { action: 'deny' }
      })

      // 全てのパーミッションを許可（カメラ、マイク、通知等）- Slackの通知に必要
      webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
        callback(true)
      })
      webContents.session.setPermissionCheckHandler(() => true)

      // ★ mainプロセスでタイトル変化を直接監視 ★
      // タブがアクティブかどうかに関係なく確実に検知できる
      let prevBadge = 0
      webContents.on('page-title-updated', (_e, title) => {
        const url = webContents.getURL()
        if (!url || url === 'about:blank') return

        const m = title.match(/\((\d+)\)/)
        const badge = m ? parseInt(m[1]) : 0

        if (badge > prevBadge) {
          let service = 'other'
          if (url.includes('slack.com')) service = 'slack'
          else if (url.includes('discord.com')) service = 'discord'
          else if (url.includes('mail.google.com')) service = 'gmail'
          else if (url.includes('github.com')) service = 'github'
          else if (url.includes('linear.app')) service = 'linear'

          const labels: Record<string, string> = {
            slack: 'Slack', discord: 'Discord', gmail: 'Gmail',
            github: 'GitHub', linear: 'Linear', other: 'その他'
          }

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('notification:from-webview', {
              service,
              title: `${labels[service]}: ${badge} 件の未読`,
              body: title.replace(/^\(\d+\)\s*/, ''),
              url,
            })
          }
        }
        prevBadge = badge
      })
    })

    // UIをロード
    if (isDev) {
      await this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow!.show()
    })

    // フォールバック: 3秒後に強制表示
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isVisible()) {
        this.mainWindow.show()
      }
    }, 3000)

    // macOS: ダークモード追従
    nativeTheme.on('updated', () => {
      this.broadcastToAll('theme:changed', {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors
      })
    })

    // ウィンドウイベント
    this.mainWindow.on('enter-full-screen', () => {
      this.mainWindow?.webContents.send('window:fullscreenChange', true)
    })
    this.mainWindow.on('leave-full-screen', () => {
      this.mainWindow?.webContents.send('window:fullscreenChange', false)
    })
    this.mainWindow.on('maximize', () => {
      this.mainWindow?.webContents.send('window:maximizeChange', true)
    })
    this.mainWindow.on('unmaximize', () => {
      this.mainWindow?.webContents.send('window:maximizeChange', false)
    })

    this.windows.add(this.mainWindow)
    this.mainWindow.on('closed', () => {
      this.windows.delete(this.mainWindow!)
      this.mainWindow = null
    })

    return this.mainWindow
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  broadcastToAll(channel: string, data?: any) {
    for (const win of this.windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }
}
