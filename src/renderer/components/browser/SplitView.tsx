import { useState, useRef, useCallback } from 'react'
import { useBrowserStore } from '../../store/browserStore'
import { WebViewContainer } from './WebViewContainer'
import { NewTabPage } from './NewTabPage'
import type { SplitViewConfig } from '@shared/types'
import clsx from 'clsx'

interface SplitViewProps {
  config: SplitViewConfig
}

export function SplitView({ config }: SplitViewProps) {
  const [ratio, setRatio] = useState(config.splitRatio)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { tabs, setSplitView, splitFocusedTabId, setSplitFocusedTab } = useBrowserStore()

  const primaryTab = tabs.find(t => t.id === config.primaryTabId)
  const secondaryTab = tabs.find(t => t.id === config.secondaryTabId)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const newRatio = config.layout === 'horizontal'
        ? (e.clientX - rect.left) / rect.width
        : (e.clientY - rect.top) / rect.height
      setRatio(Math.max(0.2, Math.min(0.8, newRatio)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      setSplitView({ ...config, splitRatio: ratio })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [config, ratio, setSplitView])

  const isHorizontal = config.layout === 'horizontal'

  const paneStyle = (tabId: string) => ({
    outline: splitFocusedTabId === tabId ? '2px solid var(--accent-primary)' : '2px solid transparent',
    outlineOffset: '-2px',
    borderRadius: '4px',
    transition: 'outline 0.15s',
  })

  return (
    <div
      ref={containerRef}
      className={clsx('flex w-full h-full', isHorizontal ? 'flex-row' : 'flex-col')}
    >
      {/* Primary pane */}
      <div
        className="overflow-hidden relative"
        style={{
          ...(isHorizontal ? { width: `${ratio * 100}%` } : { height: `${ratio * 100}%` }),
          ...paneStyle(config.primaryTabId),
        }}
        onClick={() => setSplitFocusedTab(config.primaryTabId)}
      >
        {/* フォーカスインジケーター */}
        {splitFocusedTabId === config.primaryTabId && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[10px] pointer-events-none"
            style={{ background: 'var(--accent-primary)', color: 'white', opacity: 0.85 }}>
            左
          </div>
        )}
        {primaryTab && primaryTab.url !== 'about:newtab' ? (
          <WebViewContainer tabId={primaryTab.id} />
        ) : (
          <NewTabPage />
        )}
      </div>

      {/* Divider */}
      <div
        className={clsx(
          'split-divider flex-shrink-0',
          isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
          isDragging && 'dragging'
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Secondary pane */}
      <div
        className="flex-1 overflow-hidden relative"
        style={paneStyle(config.secondaryTabId)}
        onClick={() => setSplitFocusedTab(config.secondaryTabId)}
      >
        {splitFocusedTabId === config.secondaryTabId && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[10px] pointer-events-none"
            style={{ background: 'var(--accent-primary)', color: 'white', opacity: 0.85 }}>
            右
          </div>
        )}
        {secondaryTab && secondaryTab.url !== 'about:newtab' ? (
          <WebViewContainer tabId={secondaryTab.id} />
        ) : (
          <NewTabPage />
        )}
      </div>
    </div>
  )
}
