import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Pencil, Trash2, ChevronDown } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useBrowserStore } from '../../store/browserStore'
import clsx from 'clsx'

const SPACE_COLORS = [
  '#6B4FE8','#3B82F6','#E8567A','#10B981',
  '#F59E0B','#EF4444','#8B5CF6','#06B6D4',
  '#EC4899','#84CC16','#F97316','#14B8A6',
]

export function WorkspaceSwitcher() {
  const {
    workspaces, activeWorkspaceId,
    setActiveWorkspace, addWorkspace, removeWorkspace, updateWorkspace
  } = useBrowserStore()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createColor, setCreateColor] = useState(SPACE_COLORS[0])

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId)

  const handleCreate = () => {
    if (!createName.trim()) return
    addWorkspace({ name: createName, icon: '', color: createColor })
    setCreateName('')
    setCreating(false)
    setCreateColor(SPACE_COLORS[0])
  }

  const handleRename = (id: string) => {
    if (!newName.trim()) { setEditingId(null); return }
    updateWorkspace(id, { name: newName })
    setEditingId(null); setNewName('')
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-colors
            hover:bg-[var(--sidebar-hover)] max-w-[160px]"
          style={{ color: 'var(--sidebar-text)' }}
        >
          {/* Space color pill */}
          <div
            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
            style={{ background: activeWs?.color || SPACE_COLORS[0] }}
          />
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--sidebar-text-active)' }}>
            {activeWs?.name || 'Personal'}
          </span>
          <ChevronDown size={11} className="flex-shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-56 rounded-2xl p-1.5 origin-top-left"
          style={{
            background: 'var(--cmdk-bg)',
            border: '1px solid var(--cmdk-border)',
            boxShadow: 'var(--cmdk-shadow)',
          }}
          sideOffset={6}
          align="start"
        >
          <div className="section-header px-2 pt-1 pb-1.5">Spaces</div>

          {workspaces.map(ws => (
            <div
              key={ws.id}
              className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl
                hover:bg-[var(--cmdk-item-hover)] cursor-pointer transition-colors"
              onClick={() => {
                setActiveWorkspace(ws.id)
                // Update sidebar gradient to space color
                document.documentElement.style.setProperty('--space-color', ws.color)
                setOpen(false)
              }}
            >
              <div className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                style={{ background: ws.color }} />

              {editingId === ws.id ? (
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={() => handleRename(ws.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(ws.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 text-sm bg-transparent outline-none border-b"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--accent-primary)' }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                  {ws.name}
                </span>
              )}

              {activeWorkspaceId === ws.id && (
                <Check size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              )}

              <div className="hidden group-hover:flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setEditingId(ws.id); setNewName(ws.name) }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--sidebar-hover)]"
                  style={{ color: 'var(--text-muted)' }}
                ><Pencil size={10} /></button>
                {!ws.isDefault && workspaces.length > 1 && (
                  <button
                    onClick={() => removeWorkspace(ws.id)}
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10"
                    style={{ color: 'var(--text-muted)' }}
                  ><Trash2 size={10} /></button>
                )}
              </div>
            </div>
          ))}

          <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <AnimatePresence>
              {creating ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-2 py-2 overflow-hidden"
                >
                  <input
                    autoFocus
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') setCreating(false)
                    }}
                    placeholder="Space name..."
                    className="w-full text-sm rounded-lg px-2.5 py-1.5 outline-none mb-2.5"
                    style={{
                      background: 'var(--cmdk-input-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {SPACE_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setCreateColor(c)}
                        className={clsx(
                          'w-5 h-5 rounded-full transition-transform',
                          createColor === c && 'scale-125'
                        )}
                        style={{
                          background: c,
                          boxShadow: createColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none'
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCreate}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95"
                      style={{ background: createColor }}
                    >作成</button>
                    <button
                      onClick={() => setCreating(false)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--sidebar-hover)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >キャンセル</button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-sm
                    transition-colors hover:bg-[var(--cmdk-item-hover)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ border: '1.5px dashed var(--border)' }}>
                    <Plus size={10} />
                  </div>
                  New Space
                </button>
              )}
            </AnimatePresence>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
