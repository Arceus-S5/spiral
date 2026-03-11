// ============================================================
// Tab Stacking — タブをグループにスタック（Arc風）
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Layers, X, Plus } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { TabItem } from './TabItem'
import clsx from 'clsx'
import type { TabStack } from '@shared/types'

const STACK_COLORS = [
  '#6B4FE8', '#3B82F6', '#E8567A', '#10B981',
  '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899',
]

export function TabStackList() {
  const store = useBrowserStore() as any
  const { tabs, tabStacks = [], activeTabId, activeWorkspaceId,
          createStack, deleteStack, toggleStackCollapse } = store

  const [creatingStack, setCreatingStack] = useState(false)
  const [stackName, setStackName] = useState('')
  const [stackColor, setStackColor] = useState(STACK_COLORS[0])
  const [selectedForStack, setSelectedForStack] = useState<string[]>([])

  // ワークスペースのタブでスタックに属さないもの
  const wsTabIds = tabs
    .filter(t => t.workspaceId === activeWorkspaceId && !t.isPinned)
    .map(t => t.id)

  // スタックに属するタブ
  const stackedTabIds = new Set(tabStacks.flatMap(s => s.tabIds))
  const freeTabIds = wsTabIds.filter(id => !stackedTabIds.has(id))

  const handleCreateStack = () => {
    if (!stackName.trim() || selectedForStack.length < 2) return
    createStack(stackName.trim(), stackColor, selectedForStack)
    setCreatingStack(false)
    setStackName('')
    setSelectedForStack([])
    setStackColor(STACK_COLORS[0])
  }

  return (
    <div>
      {/* Stacks */}
      {tabStacks.map(stack => (
        <StackGroup key={stack.id} stack={stack} />
      ))}

      {/* Free tabs */}
      {freeTabIds.map(id => {
        const tab = tabs.find(t => t.id === id)
        if (!tab) return null

        // Stack creation: selectable tabs
        if (creatingStack) {
          return (
            <div
              key={id}
              className={clsx(
                'tab-item cursor-pointer select-none',
                selectedForStack.includes(id) && 'active'
              )}
              onClick={() => {
                setSelectedForStack(prev =>
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                )
              }}
              style={{
                outline: selectedForStack.includes(id) ? '1.5px solid var(--accent-primary)' : 'none',
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                border: '1.5px solid var(--border)',
                background: selectedForStack.includes(id) ? 'var(--accent-primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selectedForStack.includes(id) && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                    <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--tab-text)' }}>
                {tab.customTitle || tab.title || 'New Tab'}
              </span>
            </div>
          )
        }

        return <TabItem key={id} tab={tab} />
      })}

      {/* Stack creation UI */}
      <AnimatePresence>
        {creatingStack && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', padding: '8px 4px' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              {selectedForStack.length < 2
                ? `タブを2つ以上選択（${selectedForStack.length}個選択中）`
                : `${selectedForStack.length}個のタブをスタック`}
            </div>
            <input
              autoFocus
              value={stackName}
              onChange={e => setStackName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateStack()
                if (e.key === 'Escape') setCreatingStack(false)
              }}
              placeholder="スタック名..."
              style={{
                width: '100%', padding: '5px 10px', borderRadius: 8,
                background: 'var(--cmdk-input-bg)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 12, outline: 'none', marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {STACK_COLORS.map(col => (
                <button key={col} onClick={() => setStackColor(col)}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', border: 'none',
                    background: col, cursor: 'pointer',
                    boxShadow: stackColor === col ? `0 0 0 2px white, 0 0 0 3.5px ${col}` : 'none',
                    transform: stackColor === col ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.1s',
                  }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCreateStack}
                disabled={selectedForStack.length < 2 || !stackName.trim()}
                style={{
                  flex: 1, padding: '5px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--accent-primary)', color: 'white', fontSize: 11, fontWeight: 600,
                  opacity: (selectedForStack.length < 2 || !stackName.trim()) ? 0.4 : 1,
                }}>
                作成
              </button>
              <button onClick={() => { setCreatingStack(false); setSelectedForStack([]) }}
                style={{
                  padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--cmdk-input-bg)', color: 'var(--text-secondary)', fontSize: 11,
                }}>
                キャンセル
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Stack button */}
      {!creatingStack && freeTabIds.length >= 2 && (
        <button
          onClick={() => setCreatingStack(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%', padding: '4px 8px', marginTop: 4,
            borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--text-muted)',
            fontSize: 11, transition: 'background 0.08s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <Layers size={12} />
          タブをスタック
        </button>
      )}
    </div>
  )
}

function StackGroup({ stack }: { stack: TabStack }) {
  const store = useBrowserStore() as any
  const { tabs, deleteStack, toggleStackCollapse, activeTabId, setActiveTab } = store
  const stackTabs = stack.tabIds.map(id => tabs.find(t => t.id === id)).filter(Boolean) as any[]
  const hasActive = stackTabs.some(t => t.id === activeTabId)

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Stack header */}
      <div
        className={clsx(
          'tab-item group',
          hasActive && 'active'
        )}
        onClick={() => toggleStackCollapse(stack.id)}
        style={{ userSelect: 'none' }}
      >
        <div style={{
          width: 14, height: 14, borderRadius: 4, flexShrink: 0,
          background: stack.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Layers size={9} color="white" />
        </div>
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--tab-active-text)' }}>
          {stack.name}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{stackTabs.length}</span>
        <motion.div animate={{ rotate: stack.collapsed ? 0 : 90 }} transition={{ duration: 0.1 }}>
          <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
        <button
          onClick={e => { e.stopPropagation(); deleteStack(stack.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', padding: 1,
          }}
        ><X size={10} /></button>
      </div>

      {/* Stack tabs */}
      <AnimatePresence>
        {!stack.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ overflow: 'hidden', paddingLeft: 14 }}
          >
            {stackTabs.map(tab => (
              <TabItem key={tab.id} tab={tab} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
