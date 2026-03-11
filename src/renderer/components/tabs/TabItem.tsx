import { useState } from 'react'
import { motion } from 'framer-motion'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { useBrowserStore } from '../../store/browserStore'
import { X, Pin, Copy, ExternalLink, Scissors, Lock, Pencil, Moon, Sun, VolumeX, Volume2 } from 'lucide-react'
import { useNavigate, useIpc } from '../../hooks/useIpc'
import type { Tab } from '@shared/types'
import clsx from 'clsx'

interface TabItemProps {
  tab: Tab
}

function Favicon({ tab }: { tab: Tab }) {
  const [error, setError] = useState(false)

  if (tab.isLoading) {
    return (
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        <motion.div
          className="w-3 h-3 rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  if (tab.url === 'about:newtab' || tab.url === 'about:blank') {
    return (
      <div className="favicon-placeholder flex-shrink-0">
        <span>+</span>
      </div>
    )
  }

  if (tab.isPrivate) {
    return <Lock size={14} className="flex-shrink-0 text-[var(--accent-primary)]" />
  }

  if (tab.favicon && !error) {
    return (
      <img
        src={tab.favicon}
        alt=""
        className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
        onError={() => setError(true)}
      />
    )
  }

  return (
    <div className="favicon-placeholder flex-shrink-0">
      <span>{(tab.title || tab.url)?.[0]?.toUpperCase() || '?'}</span>
    </div>
  )
}

export function TabItem({ tab }: TabItemProps) {
  const { activeTabId, setActiveTab, workspaces } = useBrowserStore()
  const { closeTab } = useNavigate()
  const { send } = useIpc()
  const [isHovered, setIsHovered] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = { current: null as HTMLInputElement | null }
  const store = useBrowserStore()
  const isActive = tab.id === activeTabId

  const hostname = (() => { try { return tab.url ? new URL(tab.url).hostname : '' } catch { return '' } })()
  const isMuted = store.mutedSites?.includes(hostname) ?? false
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hostname) store.toggleMuteSite?.(hostname)
  }

  const handleClick = () => {
    setActiveTab(tab.id)
    send('tab:setActive', { tabId: tab.id })
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    closeTab(tab.id)
  }

  const handlePin = () => store.pinTab(tab.id, !tab.isPinned)
  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenameValue(tab.customTitle || tab.title || '')
    setIsRenaming(true)
    setTimeout(() => renameInputRef.current?.select(), 20)
  }
  const commitRename = () => {
    store.updateTab(tab.id, { customTitle: renameValue.trim() || undefined })
    setIsRenaming(false)
  }
  const handleDuplicate = () => store.duplicateTab(tab.id)

  const displayTitle = tab.customTitle || tab.title || 'New Tab'

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {/* アニメーションなし・即座に表示 */}
        <div
          className={clsx('tab-item group', { active: isActive })}
          onClick={handleClick}
          onDoubleClick={() => {
            const tabBehavior = (store.settings as any)?.tabBehavior
            if (tabBehavior?.doubleClickToClose !== false) handleClose()
          }}
          onAuxClick={(e) => {
            // ミドルクリック（ホイールクリック）
            if (e.button === 1) {
              e.preventDefault()
              const tabBehavior = (store.settings as any)?.tabBehavior
              if (tabBehavior?.middleClickToClose !== false) handleClose()
            }
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ position: 'relative' }}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('tabId', tab.id)
            e.dataTransfer.effectAllowed = 'link'
          }}
          title={isActive ? "ダブルクリックで閉じる" : undefined}
        >
          <Favicon tab={tab} />

          {isRenaming ? (
            <input
              ref={renameInputRef as any}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setIsRenaming(false)
                e.stopPropagation()
              }}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-transparent outline-none min-w-0 text-sm"
              style={{
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--accent-primary)',
              }}
            />
          ) : (
            <span
              className="flex-1 text-sm truncate min-w-0"
              style={{ color: isActive ? 'var(--tab-active-text)' : 'var(--tab-text)' }}
              onDoubleClick={startRename}
            >
              {displayTitle}
            </span>
          )}

          {/* Muted indicator */}
          {isMuted && (
            <button
              onClick={toggleMute}
              title="ミュート中 (クリックで解除)"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <VolumeX size={10} />
            </button>
          )}

          {/* Hibernated indicator */}
          {tab.isHibernated && (
            <Moon size={9} className="flex-shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
          )}
          {/* Pin indicator */}
          {tab.isPinned && !isHovered && (
            <Pin size={9} className="flex-shrink-0 opacity-40" />
          )}

          {/* Close button — appears on hover/active */}
          <button
            className="flex-shrink-0 w-4 h-4 rounded-md flex items-center justify-center transition-all"
            onClick={handleClose}
            style={{
              opacity: isHovered || isActive ? 1 : 0,
              background: isHovered ? 'rgba(var(--space-color-rgb,107,79,232),0.12)' : 'transparent',
              color: 'var(--text-muted)',
              transform: isHovered || isActive ? 'scale(1)' : 'scale(0.6)',
            }}
          >
            <X size={9} />
          </button>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="z-50 min-w-48 rounded-xl p-1 shadow-xl border"
          style={{
            background: 'var(--cmdk-bg)',
            border: '1px solid var(--cmdk-border)',
            boxShadow: 'var(--cmdk-shadow)',
          }}
        >
          <ContextMenuLabel>{displayTitle}</ContextMenuLabel>
          <ContextMenu.Separator className="my-1 h-px" style={{ background: 'var(--border)' }} />

          <ContextMenuItem onSelect={handlePin} icon={<Pin size={13} />}>
            {tab.isPinned ? 'Unpin Tab' : 'Pin Tab'}
          </ContextMenuItem>

          <ContextMenuItem
            onSelect={toggleMute as any}
            icon={isMuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
          >
            {isMuted ? 'ミュート解除' : 'このサイトをミュート'}
          </ContextMenuItem>

          <ContextMenuItem onSelect={handleDuplicate} icon={<Copy size={13} />}>
            Duplicate Tab
          </ContextMenuItem>
          <ContextMenuItem onSelect={startRename as any} icon={<Pencil size={13} />}>
            タブ名を編集
          </ContextMenuItem>

          <ContextMenu.Separator className="my-1 h-px" style={{ background: 'var(--border)' }} />

          <ContextMenu.Sub>
            <ContextMenu.SubTrigger
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer
                text-[var(--text-secondary)] hover:bg-[var(--cmdk-item-hover)] outline-none"
            >
              <Scissors size={13} />
              Move to Space
              <span className="ml-auto">›</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.SubContent
              className="z-50 min-w-40 rounded-xl p-1 shadow-xl border"
              style={{
                background: 'var(--cmdk-bg)',
                border: '1px solid var(--cmdk-border)',
                boxShadow: 'var(--cmdk-shadow)',
              }}
            >
              {workspaces.map(ws => (
                <ContextMenuItem
                  key={ws.id}
                  onSelect={() => store.moveTabToWorkspace(tab.id, ws.id)}
                >
                  <span>{ws.icon}</span>
                  {ws.name}
                </ContextMenuItem>
              ))}
            </ContextMenu.SubContent>
          </ContextMenu.Sub>

          <ContextMenu.Separator className="my-1 h-px" style={{ background: 'var(--border)' }} />

          <ContextMenuItem
            onSelect={() => tab.isHibernated ? store.wakeTab(tab.id) : store.hibernateTab(tab.id)}
            icon={tab.isHibernated ? <Sun size={13} /> : <Moon size={13} />}
          >
            {tab.isHibernated ? 'タブを復帰' : 'タブを休止'}
          </ContextMenuItem>
          <ContextMenu.Separator className="my-1 h-px" style={{ background: 'var(--border)' }} />
          <ContextMenuItem
            onSelect={() => closeTab(tab.id)}
            icon={<X size={13} />}
            destructive
          >
            Close Tab
          </ContextMenuItem>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

function ContextMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1 text-xs font-medium text-[var(--text-muted)] truncate max-w-48">
      {children}
    </div>
  )
}

interface ContextMenuItemProps {
  children: React.ReactNode
  onSelect?: () => void
  icon?: React.ReactNode
  destructive?: boolean
}

function ContextMenuItem({ children, onSelect, icon, destructive }: ContextMenuItemProps) {
  return (
    <ContextMenu.Item
      onSelect={onSelect}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer outline-none transition-colors',
        destructive
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-[var(--text-secondary)] hover:bg-[var(--cmdk-item-hover)]'
      )}
    >
      {icon}
      {children}
    </ContextMenu.Item>
  )
}
