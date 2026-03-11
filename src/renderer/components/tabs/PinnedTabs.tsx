import { useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { X } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate, useIpc } from '../../hooks/useIpc'
import type { Tab } from '@shared/types'
import clsx from 'clsx'

interface PinnedTabsProps {
  tabs: Tab[]
}

export function PinnedTabs({ tabs }: PinnedTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map(tab => (
        <PinnedTabItem key={tab.id} tab={tab} />
      ))}
    </div>
  )
}

function PinnedTabItem({ tab }: { tab: Tab }) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const { activeTabId, setActiveTab } = useBrowserStore()
  const { closeTab } = useNavigate()
  const { send } = useIpc()
  const isActive = tab.id === activeTabId

  const handleClick = () => {
    setActiveTab(tab.id)
    send('tab:setActive', { tabId: tab.id })
  }

  return (
    <Tooltip.Provider delayDuration={600}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={clsx(
              'pinned-tab relative',
              isActive && 'ring-2 ring-[var(--accent-primary)] ring-opacity-60'
            )}
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {tab.favicon && !imgError ? (
              <img
                src={tab.favicon}
                alt=""
                className="w-4 h-4 object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {(tab.title || tab.url)?.[0]?.toUpperCase() || '?'}
              </span>
            )}

            {hovered && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                  bg-[var(--text-muted)] flex items-center justify-center
                  hover:bg-red-500 transition-colors"
              >
                <X size={8} className="text-white" />
              </button>
            )}

            {tab.isLoading && (
              <div className="absolute inset-0 rounded-lg flex items-center justify-center
                bg-[var(--sidebar-active)]">
                <div className="w-2 h-2 rounded-full border border-t-transparent loading-spinner"
                  style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
              </div>
            )}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 rounded-lg px-2.5 py-1.5 text-xs max-w-48 truncate shadow-lg"
            style={{
              background: 'var(--cmdk-bg)',
              border: '1px solid var(--cmdk-border)',
              color: 'var(--text-primary)',
            }}
            sideOffset={8}
          >
            {tab.title || tab.url}
            <Tooltip.Arrow style={{ fill: 'var(--cmdk-border)' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
