import { BrowserWindow, app, ipcMain, session } from 'electron'
import path from 'path'

// ============================================================
// YoutubeBackgroundPlayer
// YouTubeタブをバックグラウンドウィンドウとして保持し
// メインウィンドウを閉じても音声再生を継続する
// ============================================================

interface BGSession {
  id: string
  url: string
  title: string
  window: BrowserWindow
  isPlaying: boolean
}

export class YoutubeBackgroundPlayer {
  private sessions: Map<string, BGSession> = new Map()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win
  }

  // YouTubeのURLかどうか判定
  static isYoutubeUrl(url: string): boolean {
    try {
      const u = new URL(url)
      return u.hostname === 'www.youtube.com' ||
             u.hostname === 'youtube.com' ||
             u.hostname === 'youtu.be' ||
             u.hostname === 'music.youtube.com'
    } catch {
      return false
    }
  }

  // バックグラウンドセッションを開始
  async startSession(id: string, url: string, title: string): Promise<void> {
    // 既存セッションがあれば先に停止
    if (this.sessions.has(id)) {
      await this.stopSession(id)
    }

    const win = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,           // 非表示
      skipTaskbar: true,     // タスクバーに表示しない
      focusable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,  // バックグラウンドでも処理を止めない
        partition: `persist:bg-yt-${id}`,  // メインとは別セッション
      },
    })

    // バックグラウンドスロットリングを無効化
    win.webContents.setAudioMuted(false)

    // YouTube Music/動画を開く
    // youtube.com の場合は yt-no-pause スクリプトを注入
    await win.loadURL(url)

    // ページ読み込み後にユーザーエージェントを詐称して
    // 「バックグラウンド一時停止」を回避するスクリプトを注入
    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(`
        // YouTube の「バックグラウンド一時停止」ポリシーを無効化
        (function() {
          // Page Visibility API を上書き
          Object.defineProperty(document, 'hidden', { get: () => false })
          Object.defineProperty(document, 'visibilityState', { get: () => 'visible' })
          document.dispatchEvent(new Event('visibilitychange'))

          // visibilitychange イベントを無効化
          const origAddEventListener = document.addEventListener.bind(document)
          document.addEventListener = function(type, listener, options) {
            if (type === 'visibilitychange') return
            return origAddEventListener(type, listener, options)
          }

          // 動画要素の pause() を上書き（YouTubeが pause() を呼んでも止まらない）
          const origPause = HTMLMediaElement.prototype.pause
          HTMLMediaElement.prototype.pause = function() {
            // YouTubeの自動pauseは document.hidden=true のときのみなので無視
            if (document.hidden) return
            return origPause.call(this)
          }

          console.log('[Spiral] YouTube background play enabled')
        })()
      `).catch(() => {})
    })

    const session: BGSession = {
      id,
      url,
      title,
      window: win,
      isPlaying: true,
    }

    this.sessions.set(id, session)
    this.notifyRenderer()

    // ウィンドウが予期せず閉じられたらセッションを削除
    win.on('closed', () => {
      this.sessions.delete(id)
      this.notifyRenderer()
    })
  }

  // セッション停止
  async stopSession(id: string): Promise<void> {
    const session = this.sessions.get(id)
    if (!session) return

    if (!session.window.isDestroyed()) {
      session.window.destroy()
    }
    this.sessions.delete(id)
    this.notifyRenderer()
  }

  // 全セッション停止
  async stopAll(): Promise<void> {
    for (const id of this.sessions.keys()) {
      await this.stopSession(id)
    }
  }

  // ミュート切替
  toggleMute(id: string): void {
    const session = this.sessions.get(id)
    if (!session || session.window.isDestroyed()) return
    const muted = session.window.webContents.isAudioMuted()
    session.window.webContents.setAudioMuted(!muted)
    this.notifyRenderer()
  }

  // セッション一覧を取得
  getSessions(): { id: string; url: string; title: string; isMuted: boolean }[] {
    return Array.from(this.sessions.values())
      .filter(s => !s.window.isDestroyed())
      .map(s => ({
        id: s.id,
        url: s.url,
        title: s.title,
        isMuted: s.window.webContents.isAudioMuted(),
      }))
  }

  // rendererに現在のセッション一覧を通知
  private notifyRenderer(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('yt-bg:sessions', this.getSessions())
    }
  }

  // IPC ハンドラーをセットアップ
  setupIpcHandlers(): void {
    ipcMain.handle('yt-bg:start', async (_, { id, url, title }) => {
      await this.startSession(id, url, title)
      return { ok: true }
    })

    ipcMain.handle('yt-bg:stop', async (_, { id }) => {
      await this.stopSession(id)
      return { ok: true }
    })

    ipcMain.on('yt-bg:toggleMute', (_, { id }) => {
      this.toggleMute(id)
    })

    ipcMain.handle('yt-bg:getSessions', () => {
      return this.getSessions()
    })
  }
}
