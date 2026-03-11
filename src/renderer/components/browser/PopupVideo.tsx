// ============================================================
// Popup Video — タブ切替時にwebview内でネイティブPiPを起動
// blob: URL問題を回避するため、webview内のvideoに直接PiP要求する
// ============================================================
import { useRef, useEffect } from 'react'
import { useBrowserStore } from '../../store/browserStore'

export function PopupVideoManager() {
  const { activeTabId } = useBrowserStore()
  const prevTabRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevTabRef.current
    prevTabRef.current = activeTabId
    if (!prev || prev === activeTabId) return

    // 前のタブのwebviewで再生中の動画をネイティブPiPに入れる
    const wv = document.querySelector<Electron.WebviewTag>(`webview[data-tabid="${prev}"]`)
    if (!wv) return

    wv.executeJavaScript(`
      (function() {
        const videos = [...document.querySelectorAll('video')]
        const playing = videos.find(v => !v.paused && v.readyState >= 2)
        if (!playing) return 'no-video'
        if (document.pictureInPictureElement === playing) return 'already-pip'
        if (!document.pictureInPictureEnabled) return 'pip-disabled'
        playing.requestPictureInPicture().catch(e => console.warn('[Spiral] PiP:', e.message))
        return 'ok'
      })()
    `).catch(() => {})
  }, [activeTabId])

  return null
}
