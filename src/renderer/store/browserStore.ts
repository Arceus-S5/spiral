import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  Tab, Workspace, Bookmark, BookmarkFolder,
  HistoryEntry, Download, BrowserSettings, SplitViewConfig,
  TabGroup, TabMemo, QuickNote, HubNotification
} from '@shared/types'

// ============================================================
// Browser Store - メインの状態管理
// ============================================================

interface BrowserState {
  // Tabs
  tabs: Tab[]
  activeTabId: string | null
  tabOrder: string[]

  // Workspaces
  workspaces: Workspace[]
  activeWorkspaceId: string

  // Bookmarks
  bookmarks: Bookmark[]
  bookmarkFolders: BookmarkFolder[]

  // History
  history: HistoryEntry[]

  // Downloads
  downloads: Download[]

  // Settings
  settings: BrowserSettings | null

  // UI State
  sidebarCollapsed: boolean
  sidebarActivePanel: 'tabs' | 'bookmarks' | 'history' | 'downloads' | 'extensions' | 'settings' | 'webpanel'
  commandPaletteOpen: boolean
  splitView: SplitViewConfig | null
  splitFocusedTabId: string | null
  isFullscreen: boolean
  theme: string

  // Tab Groups
  tabGroups: TabGroup[]

  // Tab Memos
  tabMemos: Record<string, TabMemo>

  // Quick Notes
  quickNotes: QuickNote[]
  quickNoteOpen: boolean

  // Reader Mode
  readerModeTabId: string | null

  // Pinned tabs
  pinnedTabIds: string[]

  // Tab preview
  previewTabId: string | null
  previewPosition: { x: number; y: number } | null
  tabScreenshots: Record<string, string>

  // Quick Links
  quickLinks: Array<{ id: string; title: string; url: string; icon?: string }>
  addQuickLink: (link: { title: string; url: string }) => void
  removeQuickLink: (id: string) => void
  loadPersistedTabs: (data: { tabs: Tab[]; activeTabId: string | null; pinnedTabIds: string[]; tabGroups: TabGroup[] }) => void
  loadPersistedQuickLinks: (links: Array<{ id: string; title: string; url: string }>) => void

  // Actions
  // Tab actions
  addTab: (tab: Partial<Tab>) => Tab
  removeTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<Tab>) => void
  setActiveTab: (tabId: string) => void
  pinTab: (tabId: string, pinned: boolean) => void
  moveTab: (tabId: string, newIndex: number) => void
  duplicateTab: (tabId: string) => void

  // Workspace actions
  addWorkspace: (workspace: Partial<Workspace>) => Workspace
  removeWorkspace: (workspaceId: string) => void
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void
  setActiveWorkspace: (workspaceId: string) => void
  moveTabToWorkspace: (tabId: string, workspaceId: string) => void

  // Bookmark actions
  addBookmark: (bookmark: Partial<Bookmark>) => Bookmark
  removeBookmark: (bookmarkId: string) => void
  updateBookmark: (bookmarkId: string, updates: Partial<Bookmark>) => void

  // History actions
  addHistoryEntry: (entry: Partial<HistoryEntry>) => void
  clearHistory: (filter?: { olderThan?: number; domain?: string }) => void

  // Download actions
  updateDownload: (downloadId: string, updates: Partial<Download>) => void
  removeDownload: (downloadId: string) => void

  // UI actions
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarPanel: (panel: BrowserState['sidebarActivePanel']) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSplitView: (config: SplitViewConfig | null) => void
  setSplitFocusedTab: (tabId: string | null) => void
  setFullscreen: (fullscreen: boolean) => void
  setTheme: (theme: string) => void
  setSettings: (settings: BrowserSettings) => void
  setPreviewTab: (tabId: string | null, position?: { x: number; y: number } | null) => void
  setTabScreenshot: (tabId: string, screenshot: string) => void

  // Tab Group actions
  addTabGroup: (group: Partial<TabGroup>) => TabGroup
  removeTabGroup: (groupId: string) => void
  updateTabGroup: (groupId: string, updates: Partial<TabGroup>) => void
  addTabToGroup: (tabId: string, groupId: string) => void
  removeTabFromGroup: (tabId: string) => void
  toggleGroupCollapsed: (groupId: string) => void

  // Tab Memo actions
  setTabMemo: (tabId: string, content: string) => void
  getTabMemo: (tabId: string) => TabMemo | null

  // Quick Note actions
  addQuickNote: (content?: string) => QuickNote
  updateQuickNote: (id: string, content: string) => void
  removeQuickNote: (id: string) => void
  setQuickNoteOpen: (open: boolean) => void

  // Reader Mode
  setReaderMode: (tabId: string | null) => void

  // Computed helpers
  getActiveTab: () => Tab | null
  getTabsByWorkspace: (workspaceId: string) => Tab[]
  getPinnedTabs: () => Tab[]
  getUnpinnedTabs: () => Tab[]
  searchTabs: (query: string) => Tab[]
  searchHistory: (query: string) => HistoryEntry[]
  searchBookmarks: (query: string) => Bookmark[]

  // Notifications
  hubNotifications: HubNotification[]
  addHubNotification: (notif: Omit<HubNotification, 'id' | 'timestamp'>) => void
  markHubNotificationRead: (id: string) => void
  markAllHubNotificationsRead: () => void
  removeHubNotification: (id: string) => void
  clearHubNotifications: () => void

  // ミュート
  mutedSites: string[]  // hostname list
  toggleMuteSite: (hostname: string) => void
  isSiteMuted: (hostname: string) => boolean
}

// デフォルトワークスペース
const defaultWorkspace: Workspace = {
  id: 'default',
  name: 'Personal',
  icon: '',
  color: '#5b6af0',
  tabIds: [],
  createdAt: Date.now(),
  isDefault: true
}

// デフォルトタブ
const createDefaultTab = (): Tab => ({
  id: uuidv4(),
  title: 'Google',
  url: 'https://www.google.com',
  isLoading: false,
  isPinned: false,
  isPrivate: false,
  workspaceId: 'default',
  createdAt: Date.now(),
  lastVisited: Date.now(),
  canGoBack: false,
  canGoForward: false
})

export const useBrowserStore = create<BrowserState>()(
  devtools(
    subscribeWithSelector((set, get) => {
      const initialTab = createDefaultTab()

      return {
        // Initial state
        tabs: [initialTab],
        activeTabId: initialTab.id,
        tabOrder: [initialTab.id],
        workspaces: [defaultWorkspace],
        activeWorkspaceId: 'default',
        bookmarks: [],
        bookmarkFolders: [],
        history: [],
        downloads: [],
        settings: null,
        sidebarCollapsed: false,
        sidebarActivePanel: 'tabs',
        commandPaletteOpen: false,
        splitView: null,
        splitFocusedTabId: null,
        isFullscreen: false,
        theme: 'sakura',
        tabGroups: [],
        tabMemos: {},
        quickNotes: [],
        quickNoteOpen: false,
        readerModeTabId: null,
        pinnedTabIds: [],
        previewTabId: null,
        previewPosition: null,
        tabScreenshots: {},
        quickLinks: [
          { id: 'google', title: 'Google', url: 'https://google.com' },
          { id: 'github', title: 'GitHub', url: 'https://github.com' },
          { id: 'youtube', title: 'YouTube', url: 'https://youtube.com' },
          { id: 'twitter', title: 'Twitter', url: 'https://twitter.com' },
        ],
        hubNotifications: [],
        mutedSites: [],
        toggleMuteSite: (hostname) => set(s => ({
          mutedSites: s.mutedSites.includes(hostname)
            ? s.mutedSites.filter(h => h !== hostname)
            : [...s.mutedSites, hostname]
        })),
        isSiteMuted: (hostname) => get().mutedSites.includes(hostname),

        // ===== Tab Actions =====
        addTab: (partial) => {
          const tab: Tab = {
            id: uuidv4(),
            title: 'Google',
            url: 'https://www.google.com',
            isLoading: false,
            isPinned: false,
            isPrivate: false,
            workspaceId: partial.workspaceId ?? get().activeWorkspaceId,
            createdAt: Date.now(),
            lastVisited: Date.now(),
            canGoBack: false,
            canGoForward: false,
            ...partial,
          }
          set(state => {
            const ws = state.workspaces.find(w => w.id === tab.workspaceId)
            const updatedWorkspaces = ws
              ? state.workspaces.map(w =>
                  w.id === tab.workspaceId
                    ? { ...w, tabIds: [...w.tabIds, tab.id] }
                    : w
                )
              : state.workspaces

            return {
              tabs: [...state.tabs, tab],
              tabOrder: [...state.tabOrder, tab.id],
              activeTabId: tab.id,
              workspaces: updatedWorkspaces
            }
          })
          return tab
        },

        removeTab: (tabId) => {
          set(state => {
            const remaining = state.tabs.filter(t => t.id !== tabId)
            let newActiveId = state.activeTabId

            if (state.activeTabId === tabId) {
              const idx = state.tabOrder.indexOf(tabId)
              const newOrder = state.tabOrder.filter(id => id !== tabId)
              newActiveId = newOrder[Math.min(idx, newOrder.length - 1)] || null
            }

            // ワークスペースからも削除
            const updatedWorkspaces = state.workspaces.map(w => ({
              ...w,
              tabIds: w.tabIds.filter(id => id !== tabId)
            }))

            // 最後のタブが消えたら新しいタブを追加
            if (remaining.length === 0) {
              const newTab = createDefaultTab()
              return {
                tabs: [newTab],
                tabOrder: [newTab.id],
                activeTabId: newTab.id,
                pinnedTabIds: state.pinnedTabIds.filter(id => id !== tabId),
                workspaces: updatedWorkspaces
              }
            }

            return {
              tabs: remaining,
              tabOrder: state.tabOrder.filter(id => id !== tabId),
              activeTabId: newActiveId,
              pinnedTabIds: state.pinnedTabIds.filter(id => id !== tabId),
              workspaces: updatedWorkspaces
            }
          })
        },

        updateTab: (tabId, updates) => {
          set(state => ({
            tabs: state.tabs.map(t => t.id === tabId ? { ...t, ...updates } : t)
          }))
        },

        setActiveTab: (tabId) => {
          set({ activeTabId: tabId })
          set(state => ({
            tabs: state.tabs.map(t =>
              t.id === tabId ? { ...t, lastVisited: Date.now() } : t
            )
          }))
        },

        pinTab: (tabId, pinned) => {
          set(state => ({
            tabs: state.tabs.map(t => t.id === tabId ? { ...t, isPinned: pinned } : t),
            pinnedTabIds: pinned
              ? [...state.pinnedTabIds, tabId]
              : state.pinnedTabIds.filter(id => id !== tabId)
          }))
        },

        moveTab: (tabId, newIndex) => {
          set(state => {
            const order = [...state.tabOrder]
            const currentIdx = order.indexOf(tabId)
            if (currentIdx === -1) return state
            order.splice(currentIdx, 1)
            order.splice(newIndex, 0, tabId)
            return { tabOrder: order }
          })
        },

        duplicateTab: (tabId) => {
          const tab = get().tabs.find(t => t.id === tabId)
          if (tab) {
            get().addTab({ ...tab, id: undefined as any, createdAt: Date.now() })
          }
        },

        // ===== Workspace Actions =====
        addWorkspace: (partial) => {
          const workspace: Workspace = {
            id: uuidv4(),
            name: 'New Space',
            icon: '',
            color: '#5b6af0',
            tabIds: [],
            createdAt: Date.now(),
            isDefault: false,
            ...partial
          }
          set(state => ({ workspaces: [...state.workspaces, workspace] }))
          return workspace
        },

        removeWorkspace: (workspaceId) => {
          set(state => {
            if (state.workspaces.length <= 1) return state
            const tabsToRemove = state.workspaces.find(w => w.id === workspaceId)?.tabIds || []
            return {
              workspaces: state.workspaces.filter(w => w.id !== workspaceId),
              tabs: state.tabs.filter(t => !tabsToRemove.includes(t.id)),
              tabOrder: state.tabOrder.filter(id => !tabsToRemove.includes(id)),
              activeWorkspaceId: state.activeWorkspaceId === workspaceId
                ? state.workspaces.find(w => w.id !== workspaceId)?.id || 'default'
                : state.activeWorkspaceId
            }
          })
        },

        updateWorkspace: (workspaceId, updates) => {
          set(state => ({
            workspaces: state.workspaces.map(w =>
              w.id === workspaceId ? { ...w, ...updates } : w
            )
          }))
        },

        setActiveWorkspace: (workspaceId) => {
          const state = get()
          const workspace = state.workspaces.find(w => w.id === workspaceId)
          if (!workspace) return

          set({ activeWorkspaceId: workspaceId })

          // ワークスペースの最後のアクティブタブに切り替え
          const wsTabs = workspace.tabIds
          if (wsTabs.length > 0) {
            const lastTab = [...state.tabs]
              .filter(t => wsTabs.includes(t.id))
              .sort((a, b) => b.lastVisited - a.lastVisited)[0]
            if (lastTab) set({ activeTabId: lastTab.id })
          }
        },

        moveTabToWorkspace: (tabId, workspaceId) => {
          const tab = get().tabs.find(t => t.id === tabId)
          if (!tab) return

          set(state => ({
            tabs: state.tabs.map(t => t.id === tabId ? { ...t, workspaceId } : t),
            workspaces: state.workspaces.map(w => {
              if (w.id === tab.workspaceId) {
                return { ...w, tabIds: w.tabIds.filter(id => id !== tabId) }
              }
              if (w.id === workspaceId) {
                return { ...w, tabIds: [...w.tabIds, tabId] }
              }
              return w
            })
          }))
        },

        // ===== Bookmark Actions =====
        addBookmark: (partial) => {
          const bookmark: Bookmark = {
            id: uuidv4(),
            title: '',
            url: '',
            tags: [],
            createdAt: Date.now(),
            visitCount: 0,
            ...partial
          }
          set(state => ({ bookmarks: [...state.bookmarks, bookmark] }))
          return bookmark
        },

        removeBookmark: (bookmarkId) => {
          set(state => ({
            bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId)
          }))
        },

        updateBookmark: (bookmarkId, updates) => {
          set(state => ({
            bookmarks: state.bookmarks.map(b =>
              b.id === bookmarkId ? { ...b, ...updates } : b
            )
          }))
        },

        // ===== History Actions =====
        addHistoryEntry: (partial) => {
          const entry: HistoryEntry = {
            id: uuidv4(),
            title: '',
            url: '',
            visitedAt: Date.now(),
            visitCount: 1,
            ...partial
          }
          set(state => {
            // 同じURLがあれば更新
            const existing = state.history.find(h => h.url === entry.url)
            if (existing) {
              return {
                history: state.history.map(h =>
                  h.url === entry.url
                    ? { ...h, visitedAt: Date.now(), visitCount: h.visitCount + 1, title: entry.title || h.title }
                    : h
                )
              }
            }
            return { history: [entry, ...state.history].slice(0, 10000) }
          })
        },

        clearHistory: (filter) => {
          if (!filter) {
            set({ history: [] })
            return
          }
          set(state => ({
            history: state.history.filter(h => {
              if (filter.olderThan && h.visitedAt < filter.olderThan) return false
              if (filter.domain) {
                try {
                  const domain = new URL(h.url).hostname
                  if (domain.includes(filter.domain)) return false
                } catch {}
              }
              return true
            })
          }))
        },

        // ===== Download Actions =====
        updateDownload: (downloadId, updates) => {
          set(state => ({
            downloads: state.downloads.map(d =>
              d.id === downloadId ? { ...d, ...updates } : d
            )
          }))
        },

        removeDownload: (downloadId) => {
          set(state => ({
            downloads: state.downloads.filter(d => d.id !== downloadId)
          }))
        },

        // ===== UI Actions =====
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        setSidebarPanel: (panel) => set({ sidebarActivePanel: panel }),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setSplitView: (config) => set({ splitView: config }),
        setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
        setTheme: (theme) => set({ theme }),
        setSettings: (settings) => set(state => ({
          settings,
          // electron-storeの古いテーマ('system'等)で上書きしない — ユーザーが明示的に変えた場合のみ反映
          theme: (settings.theme && settings.theme !== 'system') ? settings.theme : state.theme
        })),
        setPreviewTab: (tabId, position = null) => set({
          previewTabId: tabId,
          previewPosition: position
        }),
        setTabScreenshot: (tabId, screenshot) => set(state => ({
          tabScreenshots: { ...state.tabScreenshots, [tabId]: screenshot }
        })),

        // ===== Quick Link Actions =====
        addQuickLink: (link) => set(state => ({
          quickLinks: [...state.quickLinks, { id: uuidv4(), ...link }]
        })),
        removeQuickLink: (id) => set(state => ({
          quickLinks: state.quickLinks.filter(l => l.id !== id)
        })),
        loadPersistedTabs: ({ tabs, activeTabId, pinnedTabIds, tabGroups }) => set(() => ({
          tabs,
          activeTabId: activeTabId || (tabs[0]?.id ?? null),
          tabOrder: tabs.map(t => t.id),
          pinnedTabIds,
          tabGroups,
        })),
        loadPersistedQuickLinks: (links) => set(() => ({ quickLinks: links })),

        // ===== Tab Group Actions =====
        addTabGroup: (partial) => {
          const group: TabGroup = {
            id: uuidv4(),
            name: 'New Group',
            color: '#5b6af0',
            tabIds: [],
            collapsed: false,
            createdAt: Date.now(),
            ...partial,
          }
          set(state => ({ tabGroups: [...state.tabGroups, group] }))
          return group
        },
        removeTabGroup: (groupId) => {
          set(state => ({
            tabGroups: state.tabGroups.filter(g => g.id !== groupId),
            tabs: state.tabs.map(t => t.groupId === groupId ? { ...t, groupId: undefined } : t),
          }))
        },
        updateTabGroup: (groupId, updates) => {
          set(state => ({
            tabGroups: state.tabGroups.map(g => g.id === groupId ? { ...g, ...updates } : g),
          }))
        },
        addTabToGroup: (tabId, groupId) => {
          set(state => ({
            tabs: state.tabs.map(t => t.id === tabId ? { ...t, groupId } : t),
            tabGroups: state.tabGroups.map(g =>
              g.id === groupId
                ? { ...g, tabIds: g.tabIds.includes(tabId) ? g.tabIds : [...g.tabIds, tabId] }
                : { ...g, tabIds: g.tabIds.filter(id => id !== tabId) }
            ),
          }))
        },
        removeTabFromGroup: (tabId) => {
          set(state => ({
            tabs: state.tabs.map(t => t.id === tabId ? { ...t, groupId: undefined } : t),
            tabGroups: state.tabGroups.map(g => ({ ...g, tabIds: g.tabIds.filter(id => id !== tabId) })),
          }))
        },
        toggleGroupCollapsed: (groupId) => {
          set(state => ({
            tabGroups: state.tabGroups.map(g =>
              g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
            ),
          }))
        },

        // ===== Tab Memo Actions =====
        setTabMemo: (tabId, content) => {
          set(state => ({
            tabMemos: {
              ...state.tabMemos,
              [tabId]: { tabId, content, updatedAt: Date.now() },
            },
          }))
        },
        getTabMemo: (tabId) => {
          return get().tabMemos[tabId] || null
        },

        // ===== Quick Note Actions =====
        addQuickNote: (content = '') => {
          const note: QuickNote = { id: uuidv4(), content, createdAt: Date.now(), updatedAt: Date.now() }
          set(state => ({ quickNotes: [note, ...state.quickNotes] }))
          return note
        },
        updateQuickNote: (id, content) => {
          set(state => ({
            quickNotes: state.quickNotes.map(n => n.id === id ? { ...n, content, updatedAt: Date.now() } : n),
          }))
        },
        removeQuickNote: (id) => {
          set(state => ({ quickNotes: state.quickNotes.filter(n => n.id !== id) }))
        },
        setQuickNoteOpen: (open) => set({ quickNoteOpen: open }),

        // ===== Reader Mode =====
        setReaderMode: (tabId) => set({ readerModeTabId: tabId }),

        // ===== Computed =====
        getActiveTab: () => {
          const state = get()
          return state.tabs.find(t => t.id === state.activeTabId) || null
        },
        getTabsByWorkspace: (workspaceId) => {
          return get().tabs.filter(t => t.workspaceId === workspaceId && !t.isPinned)
        },
        getPinnedTabs: () => {
          return get().tabs.filter(t => t.isPinned)
        },
        getUnpinnedTabs: () => {
          const state = get()
          return state.tabs.filter(t =>
            !t.isPinned && t.workspaceId === state.activeWorkspaceId
          )
        },
        searchTabs: (query) => {
          if (!query) return get().tabs
          const q = query.toLowerCase()
          return get().tabs.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.url.toLowerCase().includes(q)
          )
        },
        searchHistory: (query) => {
          if (!query) return get().history.slice(0, 50)
          const q = query.toLowerCase()
          return get().history.filter(h =>
            h.title.toLowerCase().includes(q) ||
            h.url.toLowerCase().includes(q)
          ).slice(0, 50)
        },
        searchBookmarks: (query) => {
          if (!query) return get().bookmarks
          const q = query.toLowerCase()
          return get().bookmarks.filter(b =>
            b.title.toLowerCase().includes(q) ||
            b.url.toLowerCase().includes(q) ||
            b.tags.some(t => t.toLowerCase().includes(q))
          )
        },

        // ---- Tab Hibernation ----
        hibernateTab: (id) => set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, isHibernated: true } : t) })),
        wakeTab: (id) => set(s => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, isHibernated: false } : t) })),

        // ---- Tab Stacking ----
        tabStacks: [] as import('../../../shared/types').TabStack[],
        createStack: (name: string, color: string, tabIds: string[]) => {
          const stackId = Date.now().toString()
          set(s => ({
            tabStacks: [...(s as any).tabStacks || [], { id: stackId, name, color, tabIds, collapsed: false, createdAt: Date.now() }],
            tabs: s.tabs.map(t => tabIds.includes(t.id) ? { ...t, stackId } : t),
          }))
        },
        addTabToStack: (tabId: string, stackId: string) => set(s => ({
          tabStacks: ((s as any).tabStacks || []).map((st: any) => st.id === stackId ? { ...st, tabIds: [...st.tabIds, tabId] } : st),
          tabs: s.tabs.map(t => t.id === tabId ? { ...t, stackId } : t),
        })),
        removeTabFromStack: (tabId: string) => set(s => ({
          tabStacks: ((s as any).tabStacks || []).map((st: any) => ({ ...st, tabIds: st.tabIds.filter((id: string) => id !== tabId) })),
          tabs: s.tabs.map(t => t.id === tabId ? { ...t, stackId: undefined } : t),
        })),
        deleteStack: (stackId: string) => set(s => ({
          tabStacks: ((s as any).tabStacks || []).filter((st: any) => st.id !== stackId),
          tabs: s.tabs.map(t => (t as any).stackId === stackId ? { ...t, stackId: undefined } : t),
        })),
        toggleStackCollapse: (stackId: string) => set(s => ({
          tabStacks: ((s as any).tabStacks || []).map((st: any) => st.id === stackId ? { ...st, collapsed: !st.collapsed } : st),
        })),

        // ===== Notification Hub Actions =====
        addHubNotification: (notif) => set(s => ({
          hubNotifications: [{
            ...notif,
            id: Date.now().toString() + Math.random(),
            timestamp: Date.now(),
          }, ...s.hubNotifications].slice(0, 200)
        })),
        markHubNotificationRead: (id) => set(s => ({
          hubNotifications: s.hubNotifications.map(n => n.id === id ? { ...n, unread: false } : n)
        })),
        markAllHubNotificationsRead: () => set(s => ({
          hubNotifications: s.hubNotifications.map(n => ({ ...n, unread: false }))
        })),
        removeHubNotification: (id) => set(s => ({
          hubNotifications: s.hubNotifications.filter(n => n.id !== id)
        })),
        clearHubNotifications: () => set({ hubNotifications: [] }),
      }
    }),
    { name: 'BrowserStore' }
  )
)

