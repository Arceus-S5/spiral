import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Youtube, Volume2, VolumeX, X, Music } from 'lucide-react'
import { useIpc } from '../../hooks/useIpc'
import { useBrowserStore } from '../../store/browserStore'

interface BgSession {
  id: string
  url: string
  title: string
  isMuted: boolean
}

// YouTubeのURLかどうか
function isYoutubeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return ['www.youtube.com', 'youtube.com', 'youtu.be', 'music.youtube.com'].includes(u.hostname)
  } catch { return false }
}

export function YoutubeBackgroundBar() {
  const [sessions, setSessions] = useState<BgSession[]>([])
  const { invoke, send, on } = useIpc()
  const { tabs, activeTabId } = useBrowserStore()

  // バックグラウンドセッション一覧を受信
  useEffect(() => {
    // 初回取得
    invoke('yt-bg:getSessions').then(s => { if (s) setSessions(s) })

    // リアルタイム更新
    const unsub = on('yt-bg:sessions', (s: BgSession[]) => setSessions(s))
    return unsub
  }, [])

  // アクティブタブがYouTubeの場合、バックグラウンド再生ボタンを表示
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isYoutube = activeTab && isYoutubeUrl(activeTab.url || '')
  const isAlreadyBg = sessions.some(s => s.id === activeTabId)

  const startBg = async () => {
    if (!activeTab || !isYoutube || isAlreadyBg) return
    await invoke('yt-bg:start', {
      id: activeTab.id,
      url: activeTab.url,
      title: activeTab.title || 'YouTube',
    })
  }

  const stopBg = async (id: string) => {
    await invoke('yt-bg:stop', { id })
  }

  const toggleMute = (id: string) => {
    send('yt-bg:toggleMute', { id })
  }

  // セッションも通知バーも非表示なら何も出さない
  if (sessions.length === 0 && !isYoutube) return null

  return (
    <div className="flex-shrink-0">
      <AnimatePresence>
        {/* バックグラウンド再生中セッション一覧 */}
        {sessions.map(session => (
          <motion.div
            key={session.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs"
            style={{
              background: 'var(--glass-bg)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {/* アイコン（アニメーション付き） */}
            <div className="relative flex-shrink-0">
              <Music size={12} style={{ color: '#ff0033' }} />
              <motion.div
                className="absolute -inset-1 rounded-full"
                style={{ background: 'rgba(255,0,51,0.15)' }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <span
              className="flex-1 truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {session.title}
            </span>

            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: 'rgba(255,0,51,0.12)',
                color: '#ff0033',
              }}
            >
              BG再生中
            </span>

            {/* ミュートボタン */}
            <button
              onClick={() => toggleMute(session.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--sidebar-hover)] flex-shrink-0"
              title={session.isMuted ? 'ミュート解除' : 'ミュート'}
              style={{ color: 'var(--text-muted)' }}
            >
              {session.isMuted
                ? <VolumeX size={11} />
                : <Volume2 size={11} />}
            </button>

            {/* 停止ボタン */}
            <button
              onClick={() => stopBg(session.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10 flex-shrink-0"
              title="バックグラウンド再生を停止"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={11} />
            </button>
          </motion.div>
        ))}

        {/* YouTubeタブを開いているときの「BG再生開始」ボタン */}
        {isYoutube && !isAlreadyBg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-3 py-1"
            style={{
              background: 'rgba(255,0,51,0.06)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <Youtube size={11} style={{ color: '#ff0033', flexShrink: 0 }} />
            <span
              className="text-xs flex-1"
              style={{ color: 'var(--text-muted)' }}
            >
              タブを閉じても音楽を続ける
            </span>
            <button
              onClick={startBg}
              className="text-[11px] px-2 py-0.5 rounded-full transition-colors flex-shrink-0"
              style={{
                background: '#ff0033',
                color: 'white',
              }}
            >
              BG再生
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
