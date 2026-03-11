// ============================================================
// Link Preview — リンクホバーでカードプレビュー表示
// OGP取得 + ミニwebviewのフォールバック
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, ExternalLink, X, Lock } from 'lucide-react'
import { useNavigate } from '../../hooks/useIpc'

interface PreviewState {
  url: string
  x: number
  y: number
  visible: boolean
}

interface OgpData {
  title?: string
  description?: string
  image?: string
  favicon?: string
  siteName?: string
}

let setPreviewGlobal: ((state: PreviewState | null) => void) | null = null

export function useLinkPreview() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showPreview = useCallback((url: string, x: number, y: number) => {
    if (!url || url.startsWith('javascript:') || url.startsWith('mailto:')) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setPreviewGlobal?.({ url, x, y, visible: true })
    }, 550)
  }, [])

  const hidePreview = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPreviewGlobal?.(null)
  }, [])

  return { showPreview, hidePreview }
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function isHttps(url: string) {
  try { return new URL(url).protocol === 'https:' } catch { return false }
}

function getFaviconUrl(url: string) {
  try {
    const { hostname } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  } catch { return null }
}

export function LinkPreviewOverlay() {
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [ogp, setOgp] = useState<OgpData | null>(null)
  const [loadingOgp, setLoadingOgp] = useState(false)
  const [webviewMode, setWebviewMode] = useState(false)
  const [webviewLoading, setWebviewLoading] = useState(false)
  const { navigate } = useNavigate()
  const abortRef = useRef<AbortController | null>(null)
  const webviewRef = useRef<any>(null)

  useEffect(() => {
    setPreviewGlobal = setPreview
    return () => { setPreviewGlobal = null }
  }, [])

  // URLが変わったらOGP取得
  useEffect(() => {
    if (!preview?.visible) return
    setOgp(null)
    setWebviewMode(false)
    setLoadingOgp(true)

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // OGPをfetch経由で取得（Electronだとcorsなし）
    const fetchOgp = async () => {
      try {
        const res = await fetch(preview.url, {
          signal: abortRef.current!.signal,
          headers: { 'User-Agent': 'SpiralBrowser/1.0' },
        })
        const html = await res.text()

        const getTag = (prop: string) => {
          const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
            || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
          return m?.[1]
        }
        const title = getTag('og:title') || getTag('twitter:title')
          || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
        const description = getTag('og:description') || getTag('twitter:description') || getTag('description')
        const image = getTag('og:image') || getTag('twitter:image')
        const siteName = getTag('og:site_name')

        // 相対パスを絶対パスに変換
        const absImage = image ? (image.startsWith('http') ? image : new URL(image, preview.url).href) : undefined

        setOgp({
          title: title?.slice(0, 80),
          description: description?.slice(0, 120),
          image: absImage,
          siteName,
          favicon: getFaviconUrl(preview.url) || undefined,
        })
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // OGP取得失敗 → webviewモードにフォールバック
          setWebviewMode(true)
          setWebviewLoading(true)
        }
      } finally {
        setLoadingOgp(false)
      }
    }

    fetchOgp()
    return () => abortRef.current?.abort()
  }, [preview?.url, preview?.visible])

  useEffect(() => {
    if (!webviewMode || !preview?.visible) return
    const wv = webviewRef.current
    if (!wv) return
    setWebviewLoading(true)
    wv.loadURL(preview.url).catch(() => {})
    const onLoad = () => setWebviewLoading(false)
    wv.addEventListener('did-finish-load', onLoad, { once: true })
  }, [webviewMode, preview?.url])

  if (!preview) return null

  // 位置計算
  const pw = 360, ph = ogp?.image ? 300 : 160
  const margin = 16
  let x = preview.x + 16
  let y = preview.y + 16
  if (x + pw > window.innerWidth - margin) x = window.innerWidth - pw - margin
  if (y + ph > window.innerHeight - margin) y = preview.y - ph - 8
  if (y < margin) y = margin

  const domain = getDomain(preview.url)
  const secure = isHttps(preview.url)

  return (
    <AnimatePresence>
      {preview.visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 6 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            left: x, top: y,
            width: pw,
            zIndex: 99999,
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.1)',
            background: 'var(--glass-bg, rgba(28,14,20,0.92))',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onMouseEnter={() => { /* マウスがカードに乗ったら消えない */ }}
        >
          {/* OGP画像 */}
          {ogp?.image && !webviewMode && (
            <div style={{ width: '100%', height: 160, overflow: 'hidden', position: 'relative', background: '#111' }}>
              <img
                src={ogp.image}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => (e.target as HTMLImageElement).style.display = 'none'}
              />
            </div>
          )}

          {/* webviewフォールバック */}
          {webviewMode && (
            <div style={{ width: '100%', height: 180, position: 'relative', background: '#141414' }}>
              {webviewLoading && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.15)',
                    borderTopColor: 'rgba(212,104,142,0.9)',
                    animation: 'spin 0.65s linear infinite',
                  }} />
                </div>
              )}
              <webview
                ref={webviewRef}
                src="about:blank"
                style={{ width: '100%', height: '100%', opacity: webviewLoading ? 0 : 1, transition: 'opacity 0.2s' }}
                partition="persist:preview"
              />
            </div>
          )}

          {/* テキスト情報 */}
          <div style={{ padding: '10px 12px 12px' }}>
            {/* サイト情報 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              {ogp?.favicon && (
                <img src={ogp.favicon} style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0 }}
                  onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              )}
              {!ogp?.favicon && <Globe size={12} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />}
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ogp?.siteName || domain}
              </span>
              {secure
                ? <Lock size={10} style={{ color: 'rgba(100,220,120,0.7)', flexShrink: 0 }} />
                : <span style={{ fontSize: 9, color: 'rgba(240,160,80,0.7)' }}>HTTP</span>
              }
            </div>

            {/* タイトル */}
            {loadingOgp ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[80, 60].map((w, i) => (
                  <div key={i} style={{
                    height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.07)',
                    width: `${w}%`, animation: 'pulse 1.2s ease infinite',
                  }} />
                ))}
              </div>
            ) : (
              <>
                {ogp?.title && (
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)',
                    marginBottom: 4, lineHeight: 1.3,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {ogp.title}
                  </div>
                )}
                {ogp?.description && (
                  <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {ogp.description}
                  </div>
                )}
              </>
            )}

            {/* URL + 開くボタン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{
                flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.25)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {preview.url}
              </span>
              <button
                onClick={() => { navigate(preview.url); setPreview(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500,
                  color: 'white',
                  background: 'rgba(212,104,142,0.75)',
                  border: 'none', borderRadius: 7, padding: '4px 10px',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(212,104,142,0.95)'}
                onMouseLeave={e => (e.target as HTMLElement).style.background = 'rgba(212,104,142,0.75)'}
              >
                <ExternalLink size={10} />
                開く
              </button>
              <button
                onClick={() => setPreview(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 7,
                  border: 'none', background: 'rgba(255,255,255,0.07)',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.4)', flexShrink: 0,
                }}
              >
                <X size={11} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
