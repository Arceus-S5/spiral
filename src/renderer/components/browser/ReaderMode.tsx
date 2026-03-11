import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, X } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'

// リーダーモード: webviewにスクリプトを注入して記事を抽出・整形表示
const READER_SCRIPT = `
(function() {
  // 記事本文を抽出する軽量Readabilityもどき
  function extractArticle() {
    const candidates = ['article', 'main', '[role="main"]', '.post-content',
      '.article-content', '.entry-content', '.content', '#content']
    for (const sel of candidates) {
      const el = document.querySelector(sel)
      if (el && el.innerText.length > 200) return el.innerHTML
    }
    // fallback: 最長テキストブロック
    let maxLen = 0, best = document.body.innerHTML
    document.querySelectorAll('div, section').forEach(el => {
      if (el.innerText.length > maxLen) { maxLen = el.innerText.length; best = el.innerHTML }
    })
    return best
  }

  const title = document.title
  const content = extractArticle()
  const url = location.href
  return JSON.stringify({ title, content, url })
})()
`

export function ReaderModeButton() {
  const { tabs, activeTabId, readerModeTabId, setReaderMode } = useBrowserStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isReader = readerModeTabId === activeTabId

  if (!activeTab || activeTab.url === 'about:newtab') return null

  return (
    <button
      onClick={() => setReaderMode(isReader ? null : activeTabId!)}
      className="no-drag w-7 h-7 flex items-center justify-center rounded-lg transition-all"
      title={isReader ? 'リーダーモード終了' : 'リーダーモード'}
      style={{ color: isReader ? 'var(--accent-primary)' : 'var(--text-muted)',
               background: isReader ? 'var(--cmdk-item-active)' : 'transparent' }}
    >
      <BookOpen size={14} />
    </button>
  )
}

export function ReaderModeOverlay({ tabId }: { tabId: string }) {
  const { readerModeTabId, setReaderMode } = useBrowserStore()
  const webviewRef = useRef<Electron.WebviewTag | null>(null)

  // webviewを探して記事を抽出
  useEffect(() => {
    if (readerModeTabId !== tabId) return

    // webviewはDOMから直接取得
    const webview = document.querySelector(`webview[partition="persist:tab-${tabId}"]`) as Electron.WebviewTag | null
    if (!webview) return
    webviewRef.current = webview

    webview.executeJavaScript(READER_SCRIPT).then((result: string) => {
      try {
        const { title, content } = JSON.parse(result)
        const overlay = document.getElementById(`reader-overlay-${tabId}`)
        if (!overlay) return
        const titleEl = overlay.querySelector('.reader-title') as HTMLElement
        const bodyEl = overlay.querySelector('.reader-body') as HTMLElement
        if (titleEl) titleEl.textContent = title
        if (bodyEl) bodyEl.innerHTML = content
      } catch {}
    }).catch(() => {})
  }, [readerModeTabId, tabId])

  if (readerModeTabId !== tabId) return null

  return (
    <motion.div
      id={`reader-overlay-${tabId}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 overflow-y-auto"
      style={{ background: 'var(--browser-bg)' }}
    >
      {/* 閉じるボタン */}
      <button
        onClick={() => setReaderMode(null)}
        className="fixed top-4 right-4 z-50 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shadow-lg transition-colors"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <X size={11} />
        リーダーモード終了
      </button>

      {/* 記事コンテンツ */}
      <div
        className="max-w-2xl mx-auto px-8 py-16"
        style={{ color: 'var(--text-primary)' }}
      >
        <h1
          className="reader-title text-3xl font-bold mb-8 leading-tight"
          style={{ color: 'var(--text-primary)' }}
        />
        <div
          className="reader-body prose leading-relaxed text-base"
          style={{
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
          }}
        />
      </div>
    </motion.div>
  )
}
