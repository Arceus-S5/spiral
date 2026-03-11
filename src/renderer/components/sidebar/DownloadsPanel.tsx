import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, FolderOpen, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useIpc } from '../../hooks/useIpc'

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DownloadsPanel() {
  const { downloads, removeDownload } = useBrowserStore()
  const { send } = useIpc()

  const completed = downloads.filter(d => d.state !== 'progressing')

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          ダウンロード
        </span>
        {completed.length > 0 && (
          <button
            onClick={() => completed.forEach(d => removeDownload(d.id))}
            className="text-[11px] px-2 py-0.5 rounded-lg hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            クリア
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {downloads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Download size={20} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ダウンロードはありません</p>
          </div>
        )}

        <AnimatePresence>
          {downloads.map(dl => (
            <motion.div
              key={dl.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl px-3 py-2.5 mb-1.5"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {dl.state === 'progressing' && (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Loader size={14} style={{ color: 'var(--accent-primary)' }} />
                    </motion.div>
                  )}
                  {dl.state === 'completed' && <CheckCircle size={14} className="text-green-500" />}
                  {(dl.state === 'cancelled' || dl.state === 'interrupted') && <AlertCircle size={14} className="text-red-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{dl.filename}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {dl.state === 'progressing'
                      ? `${dl.totalBytes ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) + '% — ' : ''}${formatBytes(dl.receivedBytes)}`
                      : dl.state === 'completed' ? formatBytes(dl.totalBytes)
                      : dl.state === 'cancelled' ? 'キャンセル済み' : 'エラー'}
                  </p>
                  {dl.state === 'progressing' && dl.totalBytes > 0 && (
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'var(--accent-primary)' }}
                        animate={{ width: `${(dl.receivedBytes / dl.totalBytes) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {dl.state === 'completed' && (
                    <button onClick={() => send('download:show', dl.id)} title="Finderで表示"
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--sidebar-hover)]"
                      style={{ color: 'var(--text-muted)' }}>
                      <FolderOpen size={11} />
                    </button>
                  )}
                  {dl.state === 'progressing' ? (
                    <button onClick={() => send('download:cancel', dl.id)} title="キャンセル"
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10"
                      style={{ color: 'var(--text-muted)' }}>
                      <X size={11} />
                    </button>
                  ) : (
                    <button onClick={() => removeDownload(dl.id)} title="削除"
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--sidebar-hover)]"
                      style={{ color: 'var(--text-muted)' }}>
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
