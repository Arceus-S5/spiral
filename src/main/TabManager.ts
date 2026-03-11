import { BrowserWindow, BrowserView, ipcMain, IpcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'

interface TabView {
  id: string
  view: BrowserView
  url: string
  title: string
  isLoading: boolean
}

export class TabManager {
  private tabs: Map<string, TabView> = new Map()
  private activeTabId: string | null = null
  private mainWindow: BrowserWindow | null = null
  forceDarkMode: boolean = false

  darkModeScript(enabled: boolean): string {
    return enabled
      ? `document.documentElement.setAttribute('data-force-dark','1');
         if(!document.getElementById('_spiral_dark')){
           const s=document.createElement('style');
           s.id='_spiral_dark';
           s.textContent=\`
             html { color-scheme: dark !important; }
             html:not([data-theme]) {
               filter: invert(0.92) hue-rotate(180deg) !important;
             }
             img, video, canvas, picture, svg, [style*="background-image"] {
               filter: invert(1) hue-rotate(180deg) !important;
             }
           \`;
           document.head.appendChild(s);
         }`
      : `document.documentElement.removeAttribute('data-force-dark');
         const el=document.getElementById('_spiral_dark');
         if(el) el.remove();`
  }

  setForceDarkMode(enabled: boolean) {
    this.forceDarkMode = enabled
    const script = this.darkModeScript(enabled)
    const { webContents } = require('electron')
    webContents.getAllWebContents().forEach((wc: Electron.WebContents) => {
      if (wc.getType() === 'webview') wc.executeJavaScript(script).catch(() => {})
    })
    // BrowserView tabs にも適用
    this.tabs.forEach(tab => {
      tab.view.webContents.executeJavaScript(script).catch(() => {})
    })
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  setupIpcHandlers(ipcMain: IpcMain) {
    ipcMain.handle('tab:create', async (event, { url, workspaceId, isPrivate }) => {
      return this.createTab(url || 'about:newtab', workspaceId, isPrivate)
    })

    ipcMain.on('tab:navigate', async (event, { tabId, url }) => {
      await this.navigateTab(tabId, url)
    })

    ipcMain.on('tab:close', (event, { tabId }) => {
      this.closeTab(tabId)
    })

    ipcMain.on('tab:reload', (event, { tabId, ignoreCache }) => {
      const tab = this.tabs.get(tabId)
      if (tab) {
        if (ignoreCache) tab.view.webContents.reloadIgnoringCache()
        else tab.view.webContents.reload()
      }
    })

    ipcMain.on('tab:goBack', (event, { tabId }) => {
      const tab = this.tabs.get(tabId)
      if (tab?.view.webContents.canGoBack()) {
        tab.view.webContents.goBack()
      }
    })

    ipcMain.on('tab:goForward', (event, { tabId }) => {
      const tab = this.tabs.get(tabId)
      if (tab?.view.webContents.canGoForward()) {
        tab.view.webContents.goForward()
      }
    })

    ipcMain.on('tab:setActive', (event, { tabId }) => {
      this.setActiveTab(tabId)
    })

    ipcMain.handle('tab:screenshot', async (event, { tabId }) => {
      // webviewタグ方式のため、mainWindowのwebContentsを通じてキャプチャ
      if (!this.mainWindow) return null
      try {
        // senderのwebContentsから対象webviewのwebContentsを探す
        const allWebContents = require('electron').webContents.getAllWebContents()
        // mainWindowに attach されている webview の webContents を探す
        const mainWcId = this.mainWindow.webContents.id
        const webviewWc = allWebContents.find((wc: any) => {
          return wc.getType() === 'webview' && wc.hostWebContents?.id === mainWcId
        })
        if (webviewWc) {
          const image = await webviewWc.capturePage()
          return image.toDataURL()
        }
        // fallback: mainWindow全体をキャプチャ
        const image = await this.mainWindow.webContents.capturePage()
        return image.toDataURL()
      } catch (e) {
        console.error('Screenshot error:', e)
        return null
      }
    })

    ipcMain.on('tab:toggleDevTools', (event, { tabId }) => {
      const tab = this.tabs.get(tabId)
      if (tab) {
        if (tab.view.webContents.isDevToolsOpened()) {
          tab.view.webContents.closeDevTools()
        } else {
          tab.view.webContents.openDevTools()
        }
      }
    })
  }

  createTab(url: string, workspaceId?: string, isPrivate?: boolean): string {
    const tabId = uuidv4()
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        javascript: true,
        images: true,
        webgl: true,
        spellcheck: true,
        autoplayPolicy: 'user-gesture-required',
        backgroundThrottling: false, // バックグラウンドでもJS・通知をフル動作させる
      }
    })

    const tabView: TabView = {
      id: tabId,
      view,
      url,
      title: 'New Tab',
      isLoading: false
    }

    // WebContentsイベント
    view.webContents.on('page-title-updated', (_event: Electron.Event, title: string) => {
      tabView.title = title
      this.sendToRenderer('tab:titleUpdated', { tabId, title })
    })

    view.webContents.on('page-favicon-updated', (_event: Electron.Event, favicons: string[]) => {
      this.sendToRenderer('tab:faviconUpdated', { tabId, favicon: favicons[0] })
    })

    view.webContents.on('did-start-loading', () => {
      tabView.isLoading = true
      this.sendToRenderer('tab:loadingChange', { tabId, isLoading: true })
    })

    view.webContents.on('did-stop-loading', () => {
      tabView.isLoading = false
      this.sendToRenderer('tab:loadingChange', { tabId, isLoading: false })
      // 強制ダークモードが有効なら注入
      if (this.forceDarkMode) {
        view.webContents.executeJavaScript(this.darkModeScript(true)).catch(() => {})
      }
    })

    view.webContents.on('did-navigate', (_event: Electron.Event, url: string) => {
      tabView.url = url
      this.sendToRenderer('tab:urlUpdated', {
        tabId,
        url,
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      })
    })

    view.webContents.on('did-navigate-in-page', (_event: Electron.Event, url: string) => {
      tabView.url = url
      this.sendToRenderer('tab:urlUpdated', {
        tabId,
        url,
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      })
    })

    view.webContents.on('certificate-error', (event: Electron.Event) => {
      event.preventDefault()
      this.sendToRenderer('tab:certificateError', { tabId })
    })

    this.tabs.set(tabId, tabView)
    view.webContents.loadURL(url === 'about:newtab' ? 'about:blank' : url)

    this.sendToRenderer('tab:created', { tabId, url, workspaceId, isPrivate })
    return tabId
  }

  async navigateTab(tabId: string, url: string) {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    let navigateUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://') &&
        !url.startsWith('about:') && !url.startsWith('file://')) {
      // URLでなければ検索
      if (url.includes('.') && !url.includes(' ')) {
        navigateUrl = `https://${url}`
      } else {
        navigateUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`
      }
    }

    await tab.view.webContents.loadURL(navigateUrl)
  }

  closeTab(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    if (this.mainWindow) {
      this.mainWindow.removeBrowserView(tab.view)
    }
    this.tabs.delete(tabId)
    this.sendToRenderer('tab:closed', { tabId })
  }

  setActiveTab(tabId: string) {
    this.activeTabId = tabId
    // WebContentsViewの表示/非表示切り替え
    for (const [id, tab] of this.tabs) {
      // 実際のElectron実装では、WebContentsViewの可視性を管理
      this.sendToRenderer('tab:activeChanged', { tabId })
    }
  }

  createTabInMainWindow(url: string) {
    return this.createTab(url)
  }

  private sendToRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }
}
