// ============================================================
// Mouse Gesture — crxMouse風の高精度マウスジェスチャー
// 右ボタン長押し+ドラッグで認識。軌跡をリアルタイム表示。
// ジェスチャー: ←戻る  →進む  ↑リロード  ↓新タブ
//               ↑→タブ閉じる  ↓→次タブ  ↓←前タブ
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import { useBrowserStore } from '../../store/browserStore'
import { useNavigate } from '../../hooks/useIpc'

const STROKE_MIN_DIST = 35
const GESTURE_MIN_LEN = 45

type Dir = 'L' | 'R' | 'U' | 'D'
interface Point { x: number; y: number }

function getCardinal(dx: number, dy: number): Dir | null {
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < STROKE_MIN_DIST) return null
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  if (angle > -45 && angle <= 45) return 'R'
  if (angle > 45 && angle <= 135) return 'D'
  if (angle <= -135 || angle > 135) return 'L'
  return 'U'
}

const GESTURE_ACTIONS: Record<string, { label: string; icon: string }> = {
  'L':  { label: '戻る',         icon: '←' },
  'R':  { label: '進む',         icon: '→' },
  'U':  { label: 'リロード',     icon: '↑' },
  'D':  { label: '新しいタブ',   icon: '↓' },
  'UR': { label: 'タブを閉じる', icon: '↑→' },
  'DR': { label: '次のタブ',     icon: '↓→' },
  'DL': { label: '前のタブ',     icon: '↓←' },
  'UL': { label: '最初に戻る',   icon: '↑←' },
  'UD': { label: 'ページ最下部', icon: '↑↓' },
  'DU': { label: 'ページ最上部', icon: '↓↑' },
}

export function MouseGestureOverlay() {
  const { goBack, goForward, reload, openNewTab, closeTab } = useNavigate()
  const store = useBrowserStore()

  const isActive = useRef(false)
  const startPos = useRef<Point>({ x: 0, y: 0 })
  const segStart = useRef<Point>({ x: 0, y: 0 })
  const sequence = useRef<Dir[]>([])
  const trailRef = useRef<Point[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const contextMenuBlocked = useRef(false)

  const [gestureLabel, setGestureLabel] = useState<string | null>(null)
  const [gesturePos, setGesturePos] = useState<Point>({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)

  const drawTrail = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const pts = trailRef.current
    if (pts.length < 2) return

    ctx.shadowBlur = 14
    ctx.shadowColor = 'rgba(212,104,142,0.9)'
    ctx.strokeStyle = 'rgba(220,120,155,0.95)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      if (i < pts.length - 1) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        const my = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
      } else {
        ctx.lineTo(pts[i].x, pts[i].y)
      }
    }
    ctx.stroke()

    // 始点
    ctx.shadowBlur = 8
    ctx.fillStyle = 'rgba(212,104,142,0.8)'
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2)
    ctx.fill()

    // 矢印
    const last = pts[pts.length - 1]
    const prev = pts[Math.max(0, pts.length - 6)]
    const ang = Math.atan2(last.y - prev.y, last.x - prev.x)
    const al = 11
    ctx.strokeStyle = 'rgba(220,120,155,1)'
    ctx.lineWidth = 2.2
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(last.x - al * Math.cos(ang - Math.PI / 6), last.y - al * Math.sin(ang - Math.PI / 6))
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(last.x - al * Math.cos(ang + Math.PI / 6), last.y - al * Math.sin(ang + Math.PI / 6))
    ctx.stroke()
  }, [])

  const execAction = useCallback((seq: Dir[]) => {
    const key = seq.join('')
    switch (key) {
      case 'L': goBack(); break
      case 'R': goForward(); break
      case 'U': reload(); break
      case 'D': openNewTab(); break
      case 'UR': if (store.activeTabId) closeTab(store.activeTabId); break
      case 'DR': {
        const idx = store.tabOrder.indexOf(store.activeTabId || '')
        const nextId = store.tabOrder[idx + 1]
        if (nextId) store.setActiveTab(nextId)
        break
      }
      case 'DL': {
        const idx = store.tabOrder.indexOf(store.activeTabId || '')
        const prevId = store.tabOrder[idx - 1]
        if (prevId) store.setActiveTab(prevId)
        break
      }
      case 'UL': goBack(); break
      case 'UD': {
        const wv = document.querySelector<any>(`webview[data-tabid="${store.activeTabId}"]`)
        wv?.executeJavaScript('window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"})')
        break
      }
      case 'DU': {
        const wv = document.querySelector<any>(`webview[data-tabid="${store.activeTabId}"]`)
        wv?.executeJavaScript('window.scrollTo({top:0,behavior:"smooth"})')
        break
      }
    }
  }, [goBack, goForward, reload, openNewTab, closeTab, store])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return
      isActive.current = true
      contextMenuBlocked.current = false
      startPos.current = { x: e.clientX, y: e.clientY }
      segStart.current = { x: e.clientX, y: e.clientY }
      sequence.current = []
      trailRef.current = [{ x: e.clientX, y: e.clientY }]
      setVisible(false)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isActive.current) return
      const pt = { x: e.clientX, y: e.clientY }
      trailRef.current.push(pt)

      const totalDist = Math.sqrt(
        Math.pow(pt.x - startPos.current.x, 2) +
        Math.pow(pt.y - startPos.current.y, 2)
      )
      if (totalDist > GESTURE_MIN_LEN) {
        setVisible(true)
        contextMenuBlocked.current = true
      }

      const dx = pt.x - segStart.current.x
      const dy = pt.y - segStart.current.y
      const dir = getCardinal(dx, dy)
      if (dir) {
        const last = sequence.current[sequence.current.length - 1]
        if (dir !== last) {
          sequence.current = [...sequence.current, dir].slice(-4)
        }
        segStart.current = pt
      }

      const key = sequence.current.join('')
      const action = GESTURE_ACTIONS[key]
      setGestureLabel(action ? `${action.icon}  ${action.label}` : (key || null))
      setGesturePos({ x: e.clientX, y: e.clientY })

      cancelAnimationFrame(animRef.current)
      animRef.current = requestAnimationFrame(drawTrail)
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!isActive.current || e.button !== 2) return
      isActive.current = false

      const moved = Math.sqrt(
        Math.pow(e.clientX - startPos.current.x, 2) +
        Math.pow(e.clientY - startPos.current.y, 2)
      )
      if (moved > GESTURE_MIN_LEN && sequence.current.length > 0) {
        execAction(sequence.current)
        contextMenuBlocked.current = true
      }

      setTimeout(() => {
        setVisible(false)
        setGestureLabel(null)
        trailRef.current = []
        sequence.current = []
        const canvas = canvasRef.current
        if (canvas) canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      }, 150)
    }

    const onContextMenu = (e: MouseEvent) => {
      if (contextMenuBlocked.current) {
        e.preventDefault()
        e.stopPropagation()
        contextMenuBlocked.current = false
      }
    }

    window.addEventListener('mousedown', onMouseDown, true)
    window.addEventListener('mousemove', onMouseMove, true)
    window.addEventListener('mouseup', onMouseUp, true)
    window.addEventListener('contextmenu', onContextMenu, true)
    return () => {
      window.removeEventListener('mousedown', onMouseDown, true)
      window.removeEventListener('mousemove', onMouseMove, true)
      window.removeEventListener('mouseup', onMouseUp, true)
      window.removeEventListener('contextmenu', onContextMenu, true)
    }
  }, [drawTrail, execAction])

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          pointerEvents: 'none',
          width: '100vw', height: '100vh',
          display: visible ? 'block' : 'none',
        }}
      />
      {visible && gestureLabel && (
        <div style={{
          position: 'fixed',
          left: gesturePos.x + 22,
          top: gesturePos.y - 44,
          zIndex: 99999,
          pointerEvents: 'none',
          background: 'rgba(20, 8, 14, 0.88)',
          color: 'white',
          padding: '7px 16px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(212, 104, 142, 0.45)',
          boxShadow: '0 4px 24px rgba(212, 104, 142, 0.35), 0 0 0 0.5px rgba(255,255,255,0.08)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}>
          {gestureLabel}
        </div>
      )}
    </>
  )
}
