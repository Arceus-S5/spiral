// ============================================================
// Shared Types - Main Process & Renderer共通型定義
// ============================================================

export interface Tab {
  id: string
  title: string
  url: string
  favicon?: string
  isLoading: boolean
  isPinned: boolean
  isPrivate: boolean
  workspaceId: string
  createdAt: number
  lastVisited: number
  canGoBack: boolean
  canGoForward: boolean
  scrollPosition?: number
  customTitle?: string
  groupId?: string
  isReaderMode?: boolean
  isHibernated?: boolean
  stackId?: string
  stackOrder?: number
  memoryUsage?: number
}

export interface Workspace {
  id: string
  name: string
  icon: string
  color: string
  tabIds: string[]
  createdAt: number
  isDefault: boolean
}

export interface Bookmark {
  id: string
  title: string
  url: string
  favicon?: string
  folderId?: string
  tags: string[]
  createdAt: number
  visitCount: number
}

export interface BookmarkFolder {
  id: string
  name: string
  parentId?: string
  createdAt: number
}

export interface HistoryEntry {
  id: string
  title: string
  url: string
  favicon?: string
  visitedAt: number
  visitCount: number
}

export interface Download {
  id: string
  filename: string
  url: string
  savePath: string
  state: 'pending' | 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  receivedBytes: number
  totalBytes: number
  startTime: number
  endTime?: number
  mimeType?: string
}

export interface Extension {
  id: string
  name: string
  version: string
  description: string
  icon?: string
  enabled: boolean
  permissions: string[]
  installPath: string
}

export interface BrowserSettings {
  theme: 'light' | 'dark' | 'system' | 'custom' | 'midnight' | 'rose' | 'sakura'
  customTheme?: CustomTheme
  sidebarWidth: number
  showBookmarksBar: boolean
  defaultSearchEngine: SearchEngine
  customSearchEngines: SearchEngine[]
  adBlockEnabled: boolean
  trackerBlockEnabled: boolean
  cookiePolicy: 'allow-all' | 'block-third-party' | 'block-all'
  hardwareAcceleration: boolean
  smoothScrolling: boolean
  defaultDownloadPath: string
  askDownloadLocation: boolean
  startupPage: 'new-tab' | 'last-session' | 'custom'
  startupUrl?: string
  fontSettings: FontSettings
  zoomLevel: number
  privateMode: boolean
  splitViewEnabled: boolean
  splitViewLayout: 'horizontal' | 'vertical'
  shortcuts: ShortcutMap
  // タブ操作
  tabBehavior: {
    doubleClickToClose: boolean       // ダブルクリックでタブを閉じる
    middleClickToClose: boolean       // ミドルクリックでタブを閉じる
    closeTabOnSwipeLeft: boolean      // 左スワイプでタブを閉じる
    switchTabOnScroll: boolean        // サイドバーでスクロールしてタブ切り替え
    confirmBeforeClose: boolean       // タブ複数時に閉じる前に確認
    restoreLastSession: boolean       // 起動時に前回セッションを復元
    openLinkInBackground: boolean     // バックグラウンドでリンクを開く
    showTabPreviewOnHover: boolean    // ホバーでタブプレビュー表示
  }
}

export interface CustomTheme {
  name: string
  colors: {
    sidebarBg: string
    sidebarText: string
    sidebarHover: string
    sidebarActive: string
    browserBg: string
    toolbarBg: string
    tabBg: string
    tabActive: string
    accentPrimary: string
    accentSecondary: string
    text: string
    textMuted: string
    border: string
  }
  customCSS?: string
}

export interface SearchEngine {
  id: string
  name: string
  url: string
  keyword: string
  icon?: string
  isDefault: boolean
}

export interface FontSettings {
  defaultSize: number
  minimumSize: number
  serif: string
  sansSerif: string
  monospace: string
}

export type ShortcutMap = Record<string, string>

export interface SplitViewConfig {
  enabled: boolean
  layout: 'horizontal' | 'vertical'
  primaryTabId: string
  secondaryTabId: string
  splitRatio: number // 0.0 - 1.0
}

export interface IpcChannels {
  // Tab management
  'tab:create': { url?: string; workspaceId?: string; isPrivate?: boolean }
  'tab:close': { tabId: string }
  'tab:navigate': { tabId: string; url: string }
  'tab:reload': { tabId: string; ignoreCache?: boolean }
  'tab:goBack': { tabId: string }
  'tab:goForward': { tabId: string }
  'tab:pin': { tabId: string; pinned: boolean }
  'tab:move': { tabId: string; newIndex: number }
  'tab:duplicate': { tabId: string }
  'tab:screenshot': { tabId: string }

  // Window management
  'window:toggleSidebar': void
  'window:toggleDevTools': { tabId: string }
  'window:setZoom': { level: number }
  'window:toggleFullscreen': void
  'window:minimize': void
  'window:maximize': void
  'window:close': void

  // Workspace
  'workspace:create': { name: string; icon?: string; color?: string }
  'workspace:delete': { workspaceId: string }
  'workspace:rename': { workspaceId: string; name: string }
  'workspace:switch': { workspaceId: string }

  // Bookmarks
  'bookmark:add': { url: string; title: string; folderId?: string }
  'bookmark:remove': { bookmarkId: string }
  'bookmark:update': Partial<Bookmark> & { id: string }

  // Downloads
  'download:start': { url: string; savePath?: string }
  'download:pause': { downloadId: string }
  'download:resume': { downloadId: string }
  'download:cancel': { downloadId: string }
  'download:show': { downloadId: string }

  // Settings
  'settings:get': void
  'settings:set': Partial<BrowserSettings>
  'settings:reset': void

  // Extensions
  'extension:install': { path: string }
  'extension:uninstall': { extensionId: string }
  'extension:toggle': { extensionId: string; enabled: boolean }
}

// ============================================================
// Tab Groups
// ============================================================
export interface TabGroup {
  id: string
  name: string
  color: string   // hex
  tabIds: string[]
  collapsed: boolean
  createdAt: number
  workspaceId?: string
}

// ============================================================
// Tab Memo
// ============================================================
export interface TabMemo {
  tabId: string
  content: string
  updatedAt: number
}

// ============================================================
// Quick Note (global floating notepad)
// ============================================================
export interface QuickNote {
  id: string
  content: string
  createdAt: number
  updatedAt: number
}

// ---- Library ----
export interface LibraryItem {
  id: string
  name: string
  path: string
  size: number
  type: 'image' | 'video' | 'audio' | 'document' | 'other'
  mimeType: string
  createdAt: number
  thumbnailDataUrl?: string
}

// ---- Link Preview ----
export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  favicon?: string
}

// ---- Tab Stack ----
export interface TabStack {
  id: string
  name: string
  color: string
  tabIds: string[]
  collapsed: boolean
  createdAt: number
}

// ---- Notification Hub ----
export interface HubNotification {
  id: string
  service: 'discord' | 'slack' | 'gmail' | 'github' | 'linear' | 'other'
  title: string
  body: string
  icon?: string
  url?: string
  unread: boolean
  timestamp: number
  tabId?: string
}
