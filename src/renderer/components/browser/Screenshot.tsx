// ============================================================
// Arc-style Screenshot — 選択範囲キャプチャ + 注釈
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Download, Copy, X, Scissors,
  Square, Circle, Pen, Type
} from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'

type ToolType = 'select' | 'arrow' | 'rect' | 'circle' | 'pen' | 'text'

interface Annotation {
  id: string
  type: Exclude<ToolType, 'select'>
  points?: { x: number; y: number }[]
  rect?: { x: number; y: number; w: number; h: number }
  text?: string
  color: string
  strokeWidth: number
}

interface ScreenshotProps {
  onClose: () => void
}

export function ScreenshotTool({ onClose }: ScreenshotProps) {
  const { activeTabId } = useBrowserStore()
  const [phase, setPhase] = useState<'capture' | 'edit'>('capture')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPt, setStartPt] = useState({ x: 0, y: 0 })
  const [tool, setTool] = useState<ToolType>('select')
  const [color, setColor] = useState('#FF453A')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPts, setCurrentPts] = useState<{ x: number; y: number }[]>([])
  const [saved, setSaved] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const COLORS = ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#0A84FF', '#BF5AF2', '#FFFFFF', '#000000']

  // スクリーンショット撮影
  const captureScreen = useCallback(async () => {
    // アクティブタブIDをmainプロセスに渡してキャプチャ
    try {
      const result = await (window as any).electronAPI?.invoke('tab:screenshot', { tabId: activeTabId })
      if (result && result !== 'data:,') {
        setScreenshot(result)
        setPhase('edit')
      } else {
        // fallback: webviewから直接取得
        const wv = document.querySelector<any>(`webview[data-tabid="${activeTabId}"]`)
        if (!wv) { onClose(); return }
        // 一時的に表示
        const prev = wv.style.visibility
        wv.style.visibility = 'visible'
        await new Promise(r => setTimeout(r, 150))
        try {
          const img = await wv.capturePage()
          const dataUrl = img?.toDataURL?.()
          if (dataUrl && dataUrl !== 'data:,') {
            setScreenshot(dataUrl)
            setPhase('edit')
          } else {
            onClose()
          }
        } catch { onClose() } finally {
          wv.style.visibility = prev
        }
      }
    } catch (e) {
      console.error('Screenshot error:', e)
      onClose()
    }
  }, [activeTabId, onClose])

  useEffect(() => { captureScreen() }, [captureScreen])

  // Canvas に描画
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !screenshot) return
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // アノテーション描画
      annotations.forEach(ann => {
        ctx.strokeStyle = ann.color
        ctx.fillStyle = ann.color
        ctx.lineWidth = ann.strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (ann.type === 'rect' && ann.rect) {
          ctx.strokeRect(ann.rect.x, ann.rect.y, ann.rect.w, ann.rect.h)
        } else if (ann.type === 'circle' && ann.rect) {
          ctx.beginPath()
          ctx.ellipse(
            ann.rect.x + ann.rect.w / 2, ann.rect.y + ann.rect.h / 2,
            Math.abs(ann.rect.w / 2), Math.abs(ann.rect.h / 2), 0, 0, Math.PI * 2
          )
          ctx.stroke()
        } else if (ann.type === 'pen' && ann.points && ann.points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(ann.points[0].x, ann.points[0].y)
          ann.points.forEach(p => ctx.lineTo(p.x, p.y))
          ctx.stroke()
        } else if (ann.type === 'text' && ann.rect && ann.text) {
          ctx.font = `bold ${18}px -apple-system`
          ctx.fillText(ann.text, ann.rect.x, ann.rect.y)
        } else if (ann.type === 'arrow' && ann.points && ann.points.length >= 2) {
          const s = ann.points[0], e = ann.points[ann.points.length - 1]
          ctx.beginPath()
          ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke()
          const angle = Math.atan2(e.y - s.y, e.x - s.x)
          const len = 14
          ctx.beginPath()
          ctx.moveTo(e.x, e.y)
          ctx.lineTo(e.x - len * Math.cos(angle - 0.4), e.y - len * Math.sin(angle - 0.4))
          ctx.lineTo(e.x - len * Math.cos(angle + 0.4), e.y - len * Math.sin(angle + 0.4))
          ctx.closePath(); ctx.fill()
        }
      })
    }
    img.src = screenshot
  }, [screenshot, annotations])

  useEffect(() => { renderCanvas() }, [renderCanvas])

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return
    setIsDrawing(true)
    const pt = getCanvasPoint(e)
    setCurrentPts([pt])
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    setCurrentPts(prev => [...prev, getCanvasPoint(e)])
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentPts.length === 0) return
    setIsDrawing(false)
    const s = currentPts[0], end = currentPts[currentPts.length - 1]
    const ann: Annotation = {
      id: Date.now().toString(),
      type: tool as any,
      color, strokeWidth: 3,
    }
    if (tool === 'pen') ann.points = currentPts
    else if (tool === 'rect' || tool === 'circle') {
      ann.rect = { x: Math.min(s.x, end.x), y: Math.min(s.y, end.y), w: Math.abs(end.x - s.x), h: Math.abs(end.y - s.y) }
    } else if (tool === 'arrow') ann.points = [s, end]
    else if (tool === 'text') {
      const text = prompt('テキストを入力:') || ''
      if (text) { ann.text = text; ann.rect = { x: s.x, y: s.y, w: 0, h: 0 } }
    }
    setAnnotations(prev => [...prev, ann])
    setCurrentPts([])
  }

  const exportImage = (mode: 'download' | 'copy') => {
    const canvas = canvasRef.current!
    if (!screenshot) return

    if (selection) {
      // crop
      const img = new Image()
      img.onload = () => {
        const scaleX = img.width / canvas.getBoundingClientRect().width
        const scaleY = img.height / canvas.getBoundingClientRect().height
        const crop = document.createElement('canvas')
        crop.width = selection.w * scaleX
        crop.height = selection.h * scaleY
        const ctx = crop.getContext('2d')!
        ctx.drawImage(canvas,
          selection.x * scaleX, selection.y * scaleY, selection.w * scaleX, selection.h * scaleY,
          0, 0, crop.width, crop.height)
        doExport(crop, mode)
      }
      img.src = screenshot
    } else {
      doExport(canvas, mode)
    }
  }

  const doExport = (canvas: HTMLCanvasElement, mode: 'download' | 'copy') => {
    if (mode === 'download') {
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `spiral-screenshot-${Date.now()}.png`
      a.click()
    } else {
      canvas.toBlob(blob => {
        if (!blob) return
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      })
    }
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  if (phase === 'capture') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 18px', borderRadius: 12,
          background: 'var(--cmdk-bg)', border: '1px solid var(--cmdk-border)',
          pointerEvents: 'auto',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>キャプチャ中...</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,0.85)',
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', flexShrink: 0,
        background: 'var(--toolbar-bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Camera size={16} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>スクリーンショット</span>
        <div style={{ flex: 1 }} />

        {/* Tools */}
        {[
          { id: 'select', icon: <Scissors size={13} />, label: '選択' },
          { id: 'arrow', icon: <span style={{ fontSize: 13 }}>↗</span>, label: '矢印' },
          { id: 'rect', icon: <Square size={13} />, label: '四角' },
          { id: 'circle', icon: <Circle size={13} />, label: '円' },
          { id: 'pen', icon: <Pen size={13} />, label: 'ペン' },
          { id: 'text', icon: <Type size={13} />, label: 'テキスト' },
        ].map(t => (
          <button key={t.id} onClick={() => setTool(t.id as ToolType)}
            title={t.label}
            style={{
              padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tool === t.id ? 'var(--cmdk-item-active)' : 'transparent',
              color: tool === t.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}>{t.icon}</button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

        {/* Colors */}
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            style={{
              width: 16, height: 16, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: c,
              boxShadow: color === c ? `0 0 0 2px var(--browser-bg), 0 0 0 3.5px ${c}` : 'none',
              flexShrink: 0,
            }} />
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

        {/* Actions */}
        <button onClick={() => setAnnotations([])}
          style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', background: 'transparent' }}>
          クリア
        </button>
        <button onClick={() => exportImage('copy')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--cmdk-input-bg)', color: 'var(--text-secondary)', fontSize: 12,
          }}>
          <Copy size={12} /> コピー
        </button>
        <button onClick={() => exportImage('download')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 600,
          }}>
          {saved ? '✓ 保存済' : <><Download size={12} /> 保存</>}
        </button>
        <button onClick={onClose}
          style={{ padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', color: 'var(--text-muted)', background: 'transparent' }}>
          <X size={14} />
        </button>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ position: 'relative', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              maxWidth: 'min(90vw, 1200px)',
              maxHeight: '72vh',
              cursor: tool === 'select' ? 'crosshair' : 'crosshair',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          />
        </div>
      </div>
    </motion.div>
  )
}
