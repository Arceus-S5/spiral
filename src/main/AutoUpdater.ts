import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, IpcMain } from 'electron'

export class AutoUpdater {
  private mainWindow: BrowserWindow | null = null
  private updateCheckInterval: NodeJS.Timeout | null = null

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win
  }

  private send(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  setupIpcHandlers(ipcMain: IpcMain) {
    ipcMain.handle('updater:checkForUpdates', async () => {
      return autoUpdater.checkForUpdates()
    })
    ipcMain.handle('updater:downloadUpdate', async () => {
      autoUpdater.downloadUpdate()
    })
    ipcMain.handle('updater:installAndRestart', () => {
      autoUpdater.quitAndInstall()
    })
  }

  initialize() {
    // GitHub Releasesから自動取得（publish設定のrepoを参照）
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.send('updater:checking')
    })

    autoUpdater.on('update-available', (info) => {
      this.send('updater:updateAvailable', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      })
    })

    autoUpdater.on('update-not-available', () => {
      this.send('updater:upToDate')
    })

    autoUpdater.on('download-progress', (progress) => {
      this.send('updater:downloadProgress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.send('updater:updateDownloaded', {
        version: info.version,
      })
    })

    autoUpdater.on('error', (err) => {
      this.send('updater:error', { message: err.message })
    })

    // 起動時に確認、その後24時間ごとにチェック
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000)
    this.updateCheckInterval = setInterval(
      () => autoUpdater.checkForUpdates().catch(() => {}),
      1000 * 60 * 60 * 24
    )
  }

  destroy() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
    }
  }
}
