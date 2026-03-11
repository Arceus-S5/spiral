import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// ============================================================
// Preload Script - セキュアなIPC橋渡し
// contextBridgeでrendererに安全なAPIを公開
// ============================================================

type IpcListener = (...args: any[]) => void

const api = {
  // ============ invoke (双方向) ============
  invoke: (channel: string, ...args: any[]) => {
    const allowedChannels = [
      'settings:get', 'settings:set', 'settings:reset',
      'tab:create', 'tab:screenshot',
      'data:getBookmarks', 'data:setBookmarks',
      'data:getHistory', 'data:setHistory',
      'data:getWorkspaces', 'data:setWorkspaces',
      'data:getTabs', 'data:setTabs',
      'data:getQuickLinks', 'data:setQuickLinks',
      'passwords:getAll', 'passwords:save', 'passwords:delete',
      'download:getAll',
      'extension:getAll',
      'system:getCpuUsage',
    ]
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Channel "${channel}" is not allowed`))
  },

  // ============ send (一方向) ============
  send: (channel: string, ...args: any[]) => {
    const allowedChannels = [
      'tab:navigate', 'tab:close', 'tab:reload',
      'tab:goBack', 'tab:goForward', 'tab:setActive',
      'tab:toggleDevTools', 'tab:pin',
      'window:minimize', 'window:maximize', 'window:close', 'window:openPrivate',
      'window:toggleFullscreen', 'window:toggleSidebar',
      'shell:openExternal',
      'download:cancel', 'download:show', 'download:clear',
      'extension:toggle',
    ]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args)
    }
  },

  // ============ on (受信) ============
  on: (channel: string, listener: IpcListener) => {
    const allowedChannels = [
      'tab:created', 'tab:closed', 'tab:titleUpdated',
      'tab:faviconUpdated', 'tab:loadingChange', 'tab:urlUpdated',
      'tab:activeChanged', 'tab:certificateError',
      'download:started', 'download:progress', 'download:done',
      'settings:updated',
      'theme:changed',
      'window:fullscreenChange', 'window:maximizeChange',
      'notification:from-webview',
      'global:toggleImmersive', 'global:newTab', 'global:closeTab', 'global:focusUrlBar',
    ]
    if (allowedChannels.includes(channel)) {
      const subscription = (_event: IpcRendererEvent, ...args: any[]) => listener(...args)
      ipcRenderer.on(channel, subscription)
      return () => ipcRenderer.removeListener(channel, subscription)
    }
    return () => {}
  },

  // ============ once ============
  once: (channel: string, listener: IpcListener) => {
    ipcRenderer.once(channel, (_event, ...args) => listener(...args))
  },

  // ============ Platform info ============
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

// TypeScript型定義（rendererで使用）
export type ElectronAPI = typeof api
