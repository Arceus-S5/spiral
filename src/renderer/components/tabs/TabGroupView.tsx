import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, FolderPlus, X } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate } from '../../hooks/useIpc'
import { TabItem } from './TabItem'
import type { TabGroup } from '@shared/types'
import clsx from 'clsx'

const GROUP_COLORS = [
  '#5b6af0', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899',
]

// ドラッグ中のタブIDをグローバルに保持
let draggingTabId: string | null = null

export function TabGroupList() {
  const { tabs, tabGroups, activeWorkspaceId, addTabGroup, activeTabId } = useBrowserStore()
  const { openNewTab } = useNavigate()
  const [dropTargetNew, setDropTargetNew] = useState(false)

  const ungroupedTabs = tabs.filter(
    t => !t.isPinned && t.workspaceId === activeWorkspaceId && !t.groupId
  )
  const wsGroups = tabGroups.filter(g =>
    g.tabIds.some(id => tabs.find(t => t.id === id && t.workspaceId === activeWorkspaceId))
    || g.tabIds.length === 0
  )

  const handleCreateGroup = () => {
    addTabGroup({ name: '新しいグループ', color: GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)] })
  }

  // 「New Tab」エリアにドロップしてグループ化
  const handleDropOnNewTab = (e: React.DragEvent) => {
    e.preventDefault()
    setDropTargetNew(false)
    const tabId = draggingTabId
    if (!tabId) return
    // 新しいグループを作ってそこに追加
    const { addTabGroup, addTabToGroup } = useBrowserStore.getState()
    const group = addTabGroup({ name: '新しいグループ', color: GROUP_COLORS[0] })
    addTabToGroup(tabId, group.id)
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* グループ一覧 */}
      {wsGroups.map(group => (
        <TabGroupItem key={group.id} group={group} />
      ))}

      {/* グループなしタブ */}
      {ungroupedTabs.map(tab => (
        <DraggableTabItem key={tab.id} tab={tab} />
      ))}

      {/* 新規タブ + ドロップゾーン */}
      <div
        onDragOver={e => { e.preventDefault(); setDropTargetNew(true) }}
        onDragLeave={() => setDropTargetNew(false)}
        onDrop={handleDropOnNewTab}
        className={clsx(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all mt-1 cursor-pointer select-none',
          dropTargetNew
            ? 'bg-[var(--accent-primary)] text-white'
            : 'text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-secondary)]'
        )}
        onClick={() => openNewTab()}
      >
        <Plus size={11} />
        {dropTargetNew ? 'ここにドロップしてグループ化' : '新しいタブ'}
        <span className="ml-auto opacity-50">⌘T</span>
      </div>

      {/* グループ作成ボタン */}
      <button
        onClick={handleCreateGroup}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors
          text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-secondary)]"
      >
        <FolderPlus size={11} />
        グループを作成
      </button>
    </div>
  )
}

// ドラッグ可能なTabItemラッパー
function DraggableTabItem({ tab }: { tab: any }) {
  return (
    <div
      draggable
      onDragStart={() => { draggingTabId = tab.id }}
      onDragEnd={() => { draggingTabId = null }}
    >
      <TabItem tab={tab} />
    </div>
  )
}

function TabGroupItem({ group }: { group: TabGroup }) {
  const { tabs, activeTabId, updateTabGroup, removeTabGroup, toggleGroupCollapsed, addTabToGroup } = useBrowserStore()
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(group.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const groupTabs = group.tabIds
    .map(id => tabs.find(t => t.id === id))
    .filter(Boolean) as typeof tabs

  const hasActiveTab = groupTabs.some(t => t.id === activeTabId)

  const handleRename = () => {
    if (nameVal.trim()) updateTabGroup(group.id, { name: nameVal.trim() })
    setEditing(false)
  }

  // タブをこのグループにドロップ
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (draggingTabId) {
      addTabToGroup(draggingTabId, group.id)
      draggingTabId = null
    }
  }

  return (
    <div className="flex flex-col">
      <div
        className={clsx(
          'group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all',
          isDragOver ? 'ring-2' : '',
          hasActiveTab ? 'bg-[var(--sidebar-hover)]' : 'hover:bg-[var(--sidebar-hover)]'
        )}
        style={isDragOver ? { ringColor: group.color, background: group.color + '22' } : {}}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* 折りたたみ */}
        <button
          onClick={() => toggleGroupCollapsed(group.id)}
          className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center"
          style={{ color: 'var(--text-muted)' }}
        >
          {group.collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        </button>

        {/* カラードット */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-3 h-3 rounded-full flex-shrink-0 transition-transform hover:scale-110"
            style={{ background: group.color }}
          />
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute left-0 top-5 z-50 flex gap-1 p-1.5 rounded-xl shadow-xl"
                style={{ background: 'var(--cmdk-bg)', border: '1px solid var(--border)' }}
              >
                {GROUP_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { updateTabGroup(group.id, { color: c }); setShowColorPicker(false) }}
                    className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                    style={{ background: c, outline: group.color === c ? `2px solid ${c}` : 'none', outlineOffset: 1 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* グループ名 */}
        {editing ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 text-xs bg-transparent outline-none border-b"
            style={{ borderColor: group.color, color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs font-medium truncate"
            style={{ color: 'var(--text-secondary)' }}
            onDoubleClick={() => { setEditing(true); setNameVal(group.name) }}
          >
            {group.name}
          </span>
        )}

        {/* タブ数 */}
        <span
          className="text-[10px] px-1 rounded flex-shrink-0"
          style={{ background: group.color + '22', color: group.color }}
        >
          {groupTabs.length}
        </span>

        {/* アクション（ホバー時） */}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => { setEditing(true); setNameVal(group.name) }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={() => removeTabGroup(group.id)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* グループ内タブ */}
      <AnimatePresence>
        {!group.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="ml-3 pl-2 flex flex-col gap-0.5 overflow-hidden"
            style={{ borderLeft: `2px solid ${group.color}44` }}
          >
            {groupTabs.map(tab => (
              <DraggableTabItem key={tab.id} tab={tab} />
            ))}
            {groupTabs.length === 0 && (
              <div
                className="text-[10px] py-2 px-1 text-center rounded-lg"
                style={{ color: 'var(--text-muted)', background: group.color + '11' }}
              >
                タブをここにドラッグして追加
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
