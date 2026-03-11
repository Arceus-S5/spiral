// ============================================================
// Library — Finderを使わずファイルアップロード & 管理
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, Image, Film, Music, FileText, File,
  Search, Grid, List, Trash2, ExternalLink, Copy
} from 'lucide-react'
import type { LibraryItem } from '@shared/types'

interface LibraryProps {
  onClose: () => void
  onInsert?: (item: LibraryItem) => void
}

function getFileType(mime: string): LibraryItem['type'] {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text')) return 'document'
  return 'other'
}

function FileIcon({ type, size = 20 }: { type: LibraryItem['type']; size?: number }) {
  const props = { size, style: { flexShrink: 0 } }
  const colors: Record<string, string> = {
    image: '#30D158', video: '#FF453A', audio: '#BF5AF2', document: '#0A84FF', other: '#98989D'
  }
  const icons = {
    image: <Image {...props} color={colors.image} />,
    video: <Film {...props} color={colors.video} />,
    audio: <Music {...props} color={colors.audio} />,
    document: <FileText {...props} color={colors.document} />,
    other: <File {...props} color={colors.other} />,
  }
  return icons[type]
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Library({ onClose, onInsert }: LibraryProps) {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [filter, setFilter] = useState<LibraryItem['type'] | 'all'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ローカルストレージからライブラリを読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spiral-library')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  const saveItems = (newItems: LibraryItem[]) => {
    setItems(newItems)
    try { localStorage.setItem('spiral-library', JSON.stringify(newItems)) } catch {}
  }

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const newItems: LibraryItem[] = await Promise.all(arr.map(async file => {
      const type = getFileType(file.type)
      let thumbnailDataUrl: string | undefined
      if (type === 'image') {
        thumbnailDataUrl = await new Promise(res => {
          const reader = new FileReader()
          reader.onload = e => res(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      }
      const dataUrl: string = await new Promise(res => {
        const reader = new FileReader()
        reader.onload = e => res(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        path: dataUrl,
        size: file.size,
        type, mimeType: file.type,
        createdAt: Date.now(),
        thumbnailDataUrl: thumbnailDataUrl || dataUrl,
      }
    }))
    saveItems([...items, ...newItems])
  }, [items])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingOver(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const filtered = items.filter(item => {
    const matchQuery = item.name.toLowerCase().includes(query.toLowerCase())
    const matchFilter = filter === 'all' || item.type === filter
    return matchQuery && matchFilter
  })

  const selectedItem = items.find(i => i.id === selected)

  const FILTERS: { id: LibraryItem['type'] | 'all'; label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'image', label: '画像' },
    { id: 'video', label: '動画' },
    { id: 'audio', label: '音楽' },
    { id: 'document', label: '書類' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99995,
        display: 'flex', flexDirection: 'column',
        background: 'var(--browser-bg)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', flexShrink: 0,
        background: 'var(--toolbar-bg)',
        borderBottom: '1px solid var(--border)',
      }}>

        {/* Search */}
        <div style={{
          flex: 1, maxWidth: 320,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 10,
          background: 'var(--input-bg)',
        }}>
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="検索..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 12, color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 500,
                background: filter === f.id ? 'var(--cmdk-item-active)' : 'transparent',
                color: filter === f.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          {view === 'grid' ? <List size={15} /> : <Grid size={15} />}
        </button>

        {/* Upload */}
        <button onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 600,
          }}>
          <Upload size={12} /> アップロード
        </button>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
          onChange={e => e.target.files && addFiles(e.target.files)} />

        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main content */}
        <div
          style={{ flex: 1, overflow: 'auto', padding: 20, position: 'relative' }}
          onDragOver={e => { e.preventDefault(); setIsDraggingOver(true) }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
        >
          {/* Drop zone overlay */}
          <AnimatePresence>
            {isDraggingOver && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: `rgba(var(--space-color-rgb,107,79,232),0.08)`,
                  border: `2px dashed var(--accent-primary)`,
                  borderRadius: 16, gap: 12, margin: 4,
                }}>
                <Upload size={40} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-primary)' }}>ファイルをドロップ</span>
              </motion.div>
            )}
          </AnimatePresence>

          {filtered.length === 0 ? (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <Upload size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {items.length === 0 ? 'ファイルをドラッグ＆ドロップまたはアップロード' : '検索結果なし'}
              </div>
            </div>
          ) : view === 'grid' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}>
              {filtered.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  style={{
                    borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                    background: 'var(--cmdk-input-bg)',
                    border: `2px solid ${selected === item.id ? 'var(--accent-primary)' : 'transparent'}`,
                    transition: 'border-color 0.1s',
                  }}
                >
                  <div style={{ height: 100, background: 'var(--border)', position: 'relative', overflow: 'hidden' }}>
                    {item.thumbnailDataUrl && (item.type === 'image' || item.type === 'video') ? (
                      <img src={item.thumbnailDataUrl} alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileIcon type={item.type} size={32} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatSize(item.size)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map(item => (
                <div key={item.id}
                  onClick={() => setSelected(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
                    background: selected === item.id ? 'var(--cmdk-item-active)' : 'transparent',
                    transition: 'background 0.08s',
                  }}
                  onMouseEnter={e => { if (selected !== item.id) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
                  onMouseLeave={e => { if (selected !== item.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <FileIcon type={item.type} size={16} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{formatSize(item.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                flexShrink: 0, borderLeft: '1px solid var(--border)',
                background: 'var(--toolbar-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ padding: 16, flex: 1, overflow: 'auto' }}>
                {/* Preview */}
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: 'var(--border)', marginBottom: 12 }}>
                  {selectedItem.thumbnailDataUrl ? (
                    <img src={selectedItem.thumbnailDataUrl} alt={selectedItem.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileIcon type={selectedItem.type} size={40} />
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {selectedItem.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {formatSize(selectedItem.size)} · {selectedItem.mimeType}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {onInsert && (
                    <button onClick={() => { onInsert(selectedItem); onClose() }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                        background: 'var(--accent-primary)', color: 'white', fontSize: 12, fontWeight: 600,
                      }}>
                      <ExternalLink size={12} /> 挿入
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(selectedItem.path)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: 'var(--cmdk-input-bg)', color: 'var(--text-secondary)', fontSize: 12,
                    }}>
                    <Copy size={12} /> コピー
                  </button>
                  <button
                    onClick={() => {
                      saveItems(items.filter(i => i.id !== selectedItem.id))
                      setSelected(null)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: 'rgba(255,69,58,0.1)', color: '#FF453A', fontSize: 12,
                    }}>
                    <Trash2 size={12} /> 削除
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
