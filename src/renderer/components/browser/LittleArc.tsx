// ============================================================
// Little Arc — Arc風ミニウィンドウ (フローティングブラウザ)
// ============================================================
import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Minus, Maximize2, Globe, ChevronLeft,
  ChevronRight, RotateCw, Pin, Wind
} from 'lucide-react'
import { useNavigate } from '../../hooks/useIpc'

// ---- Starfield ----
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stars = useMemo(() => Array.from({ length: 100 }, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * 1.3 + 0.3,
    speed: Math.random() * 0.00012 + 0.00004,
    opacity: Math.random() * 0.5 + 0.15,
    twinkle: Math.random() * Math.PI * 2,
  })), [])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number, t = 0
    const draw = () => {
      const w = canvas.width = canvas.offsetWidth
      const h = canvas.height = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      t++
      stars.forEach(s => {
        const tw = 0.55 + 0.45 * Math.sin(t * 0.035 + s.twinkle)
        ctx.beginPath()
        ctx.arc(s.x * w, ((s.y + s.speed * t) % 1) * h, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210,160,185,${s.opacity * tw})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [stars])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

interface LittleArcProps {
  initialUrl?: string
  onClose: () => void
}

export function LittleArc({ initialUrl = 'about:blank', onClose }: LittleArcProps) {
  const [url, setUrl] = useState(initialUrl)
  const [inputVal, setInputVal] = useState(initialUrl)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 300, y: 80 })
  const [isLoading, setIsLoading] = useState(false)
  const wvRef = useRef<Electron.WebviewTag | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const { navigate: mainNavigate } = useNavigate()

  const W = 600, H = 420

  const handleNavigate = (target: string) => {
    const finalUrl = target.startsWith('http') ? target
      : target.includes('.') && !target.includes(' ') ? `https://${target}`
      : `https://www.google.com/search?q=${encodeURIComponent(target)}`
    setUrl(finalUrl)
    setInputVal(finalUrl)
    wvRef.current?.loadURL(finalUrl)
  }

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y }
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - W, dragRef.current.ox + e.clientX - dragRef.current.startX)),
        y: Math.max(0, Math.min(window.innerHeight - H, dragRef.current.oy + e.clientY - dragRef.current.startY)),
      })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  useEffect(() => {
    const wv = wvRef.current
    if (!wv || !initialUrl || initialUrl === 'about:blank') return
    const onLoad = () => setIsLoading(false)
    const onStart = () => setIsLoading(true)
    const onNavigate = (e: any) => { setUrl(e.url); setInputVal(e.url) }
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-finish-load', onLoad)
    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigate)
    return () => {
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-finish-load', onLoad)
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigate)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 12 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: W, height: H, zIndex: 99998,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
        background: 'var(--browser-bg)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleDragStart}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', cursor: 'default',
          background: 'var(--toolbar-bg)',
          borderBottom: '1px solid var(--browser-border)',
          flexShrink: 0, userSelect: 'none',
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', border: 'none', cursor: 'pointer' }} />
          <button onClick={onClose}
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', border: 'none', cursor: 'pointer' }} />
          <button onClick={() => mainNavigate(url)}
            style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', border: 'none', cursor: 'pointer' }}
            title="メインウィンドウで開く" />
        </div>

        {/* Nav */}
        <button
          onClick={() => wvRef.current?.canGoBack() && wvRef.current.goBack()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
        ><ChevronLeft size={14} /></button>
        <button
          onClick={() => wvRef.current?.canGoForward() && wvRef.current.goForward()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
        ><ChevronRight size={14} /></button>

        {/* URL bar */}
        <form
          onSubmit={e => { e.preventDefault(); handleNavigate(inputVal) }}
          style={{ flex: 1, display: 'flex' }}
        >
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 8,
            background: 'var(--input-bg)', border: '1px solid var(--border)',
          }}>
            {isLoading
              ? <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              : <Globe size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            }
            <input
              value={isInputFocused ? inputVal : url}
              onChange={e => setInputVal(e.target.value)}
              onFocus={e => { setIsInputFocused(true); setInputVal(url); setTimeout(() => e.target.select(), 50) }}
              onBlur={() => setIsInputFocused(false)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 11, color: 'var(--text-primary)', minWidth: 0
              }}
              spellCheck={false}
            />
          </div>
        </form>

        <button
          onClick={() => wvRef.current?.reload()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
        ><RotateCw size={12} /></button>
        <button
          onClick={() => setIsPinned(p => !p)}
          title="固定"
          style={{
            background: isPinned ? 'rgba(var(--space-color-rgb,107,79,232),0.12)' : 'none',
            border: 'none', cursor: 'pointer',
            color: isPinned ? 'var(--accent-primary)' : 'var(--text-muted)',
            display: 'flex', padding: 2, borderRadius: 4,
          }}
        ><Pin size={11} /></button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {(url === 'about:blank' || !url) ? (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--new-tab-bg)', gap: 12, position: 'relative', overflow: 'hidden',
          }}>
            <StarField />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Wind size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>URLを入力してください</div>
            </div>
          </div>
        ) : (
          <webview
            ref={wvRef as any}
            src={url}
            style={{ width: '100%', height: '100%' }}
            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          />
        )}
      </div>
    </motion.div>
  )
}

// ---- グローバルLittleArcコンテナ ----
export function LittleArcContainer() {
  const [windows, setWindows] = useState<Array<{ id: string; url: string }>>([])

  useEffect(() => {
    ;(window as any).__openLittleArc = (url?: string) => {
      const id = Date.now().toString()
      setWindows(prev => [...prev, { id, url: url || 'about:blank' }])
    }
    return () => { delete (window as any).__openLittleArc }
  }, [])

  return (
    <>
      <AnimatePresence>
        {windows.map(w => (
          <LittleArc
            key={w.id}
            initialUrl={w.url}
            onClose={() => setWindows(prev => prev.filter(x => x.id !== w.id))}
          />
        ))}
      </AnimatePresence>
    </>
  )
}
