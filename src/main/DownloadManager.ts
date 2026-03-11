import { BrowserWindow, DownloadItem, dialog } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import { Download } from '../shared/types'

export class DownloadManager {
  private downloads: Map<string, Download> = new Map()
  private activeItems: Map<string, DownloadItem> = new Map()

  constructor(private store: Store<any>) {
    // 保存済みダウンロードを復元
    const saved = store.get('downloads' as any, []) as Download[]
    for (const d of saved) {
      this.downloads.set(d.id, d)
    }
  }

  handleDownload(item: DownloadItem, window: BrowserWindow) {
    const settings = this.store.get('settings')
    const downloadId = uuidv4()

    const savePath = settings.askDownloadLocation
      ? dialog.showSaveDialogSync(window, {
          defaultPath: path.join(settings.defaultDownloadPath, item.getFilename()),
          filters: [{ name: 'All Files', extensions: ['*'] }]
        }) || path.join(settings.defaultDownloadPath, item.getFilename())
      : path.join(settings.defaultDownloadPath, item.getFilename())

    item.setSavePath(savePath)

    const download: Download = {
      id: downloadId,
      filename: item.getFilename(),
      url: item.getURL(),
      savePath,
      state: 'pending',
      receivedBytes: 0,
      totalBytes: item.getTotalBytes(),
      startTime: Date.now(),
      mimeType: item.getMimeType()
    }

    this.downloads.set(downloadId, download)
    this.activeItems.set(downloadId, item)

    // 進捗通知
    item.on('updated', (_, state) => {
      const d = this.downloads.get(downloadId)!
      d.state = state === 'progressing' ? 'progressing' : 'interrupted'
      d.receivedBytes = item.getReceivedBytes()
      d.totalBytes = item.getTotalBytes()
      window.webContents.send('download:progress', d)
    })

    item.once('done', (_, state) => {
      const d = this.downloads.get(downloadId)!
      d.state = state === 'completed' ? 'completed' : 'interrupted'
      d.endTime = Date.now()
      d.receivedBytes = item.getReceivedBytes()
      this.activeItems.delete(downloadId)
      this.persist()
      window.webContents.send('download:done', d)
    })

    window.webContents.send('download:started', download)
  }

  getAll(): Download[] {
    return Array.from(this.downloads.values()).sort((a, b) => b.startTime - a.startTime)
  }

  cancel(id: string) {
    const item = this.activeItems.get(id)
    if (item) {
      item.cancel()
      const d = this.downloads.get(id)
      if (d) d.state = 'cancelled'
    }
  }

  showInFinder(id: string) {
    const d = this.downloads.get(id)
    if (d?.savePath) {
      const { shell } = require('electron')
      shell.showItemInFolder(d.savePath)
    }
  }

  clearCompleted() {
    for (const [id, d] of this.downloads) {
      if (d.state === 'completed' || d.state === 'cancelled') {
        this.downloads.delete(id)
      }
    }
    this.persist()
  }

  private persist() {
    this.store.set('downloads' as any, this.getAll().slice(0, 100))
  }
}
