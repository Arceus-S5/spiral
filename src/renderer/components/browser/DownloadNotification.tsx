import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useIpc } from '../../hooks/useIpc'

export function DownloadNotification() {
  const { downloads } = useBrowserStore()
  const { send } = useIpc()

  const activeDownloads = downloads.filter(d =>
    d.state === 'progressing' || d.state === 'pending'
  )
  const recentCompleted = downloads.filter(d => {
    if (d.state !== 'completed') return false
    return d.endTime && Date.now() - d.endTime < 5000
  })

  const notifications = [...activeDownloads, ...recentCompleted].slice(0, 3)

  const formatProgress = (received: number, total: number) => {
    if (total === 0) return '...'
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)
    const pct = Math.round((received / total) * 100)
    return `${mb(received)}/${mb(total)} MB (${pct}%)`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {notifications.map(dl => (
          <motion.div
            key={dl.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl min-w-72 max-w-80"
            style={{
              background: 'var(--cmdk-bg)',
              border: '1px solid var(--cmdk-border)',
              boxShadow: 'var(--cmdk-shadow)',
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: dl.state === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(91,106,240,0.15)',
                color: dl.state === 'completed' ? '#22c55e' : 'var(--accent-primary)'
              }}
            >
              {dl.state === 'completed' ? <CheckCircle size={16} /> : <Download size={16} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {dl.filename}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {dl.state === 'completed'
                  ? 'Download complete'
                  : formatProgress(dl.receivedBytes, dl.totalBytes)
                }
              </div>

              {dl.state === 'progressing' && dl.totalBytes > 0 && (
                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--accent-primary)' }}
                    animate={{ width: `${(dl.receivedBytes / dl.totalBytes) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>

            {dl.state === 'completed' && (
              <button
                onClick={() => send('download:show', dl.id)}
                className="flex-shrink-0 text-xs px-2 py-1 rounded-lg transition-colors"
                style={{
                  background: 'var(--sidebar-hover)',
                  color: 'var(--text-muted)'
                }}
              >
                Show
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
