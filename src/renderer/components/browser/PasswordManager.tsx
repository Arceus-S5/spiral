import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Eye, EyeOff, Trash2, X, Check, Lock } from 'lucide-react'
import { useIpc } from '../../hooks/useIpc'

interface PasswordEntry {
  id: string
  domain: string
  username: string
  password: string
  createdAt: number
  updatedAt?: number
}

// ============================================================
// パスワード保存バナー（ログイン検知時に表示）
// ============================================================
export function PasswordSaveBanner({
  domain,
  username,
  password,
  onSave,
  onDismiss,
}: {
  domain: string
  username: string
  password: string
  onSave: () => void
  onDismiss: () => void
}) {
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaved(true)
    onSave()
    // 1.2秒後に自動で閉じる
    setTimeout(() => onDismiss(), 1200)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.2 }}
      className="absolute top-2 left-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-xl"
      style={{
        transform: 'translateX(-50%)',
        background: 'var(--cmdk-bg)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        minWidth: 320,
      }}
    >
      <Lock size={15} style={{ color: saved ? '#22c55e' : 'var(--accent-primary)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {saved ? '✓ 保存しました' : 'パスワードを保存しますか？'}
        </div>
        {!saved && (
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {username} — {domain}
          </div>
        )}
      </div>
      {!saved && (
        <>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-medium flex-shrink-0 transition-all active:scale-95"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            <Check size={11} /> 保存
          </button>
          <button
            onClick={onDismiss}
            className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={13} />
          </button>
        </>
      )}
    </motion.div>
  )
}

// ============================================================
// パスワード管理パネル（設定画面内）
// ============================================================
export function PasswordsPanel() {
  const { invoke } = useIpc()
  const [passwords, setPasswords] = useState<PasswordEntry[]>([])
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke('passwords:getAll').then((data: PasswordEntry[]) => {
      setPasswords(data || [])
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id: string) => {
    const updated = await invoke('passwords:delete', id)
    setPasswords(updated || [])
  }

  if (loading) {
    return <div className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>読み込み中...</div>
  }

  if (passwords.length === 0) {
    return (
      <div className="text-center py-10">
        <Key size={24} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>保存されたパスワードはありません</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {passwords.map(entry => (
        <div
          key={entry.id}
          className="flex flex-col gap-1 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--cmdk-input-bg)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {entry.domain}
            </span>
            <button
              onClick={() => handleDelete(entry.id)}
              className="w-5 h-5 flex items-center justify-center rounded-md flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{entry.username}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
              {showPw[entry.id] ? entry.password : '••••••••••••'}
            </span>
            <button
              onClick={() => setShowPw(p => ({ ...p, [entry.id]: !p[entry.id] }))}
              style={{ color: 'var(--text-muted)' }}
            >
              {showPw[entry.id] ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// WebViewのフォーム送信を監視してパスワードを検知するhook
// ============================================================
export function usePasswordDetection(
  webviewRef: React.RefObject<Electron.WebviewTag>,
  tabUrl: string
) {
  const { invoke } = useIpc()
  const [pendingSave, setPendingSave] = useState<{
    domain: string; username: string; password: string
  } | null>(null)


  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    // ページロード完了後にフォーム送信イベントを注入
    const injectFormListener = async () => {
      try {
        await webview.executeJavaScript(`
          if (!window.__pwListenerAdded) {
            window.__pwListenerAdded = true
            document.addEventListener('submit', function(e) {
              const form = e.target
              if (!form) return
              const pwInput = form.querySelector('input[type="password"]')
              if (!pwInput || !pwInput.value) return
              const userInput = form.querySelector(
                'input[type="email"], input[type="text"], input[name*="user"], input[name*="email"], input[name*="login"], input[id*="user"], input[id*="email"]'
              )
              if (userInput && userInput.value) {
                window.__pendingCredentials = { username: userInput.value, password: pwInput.value }
              }
            }, true)
          }
        `)
      } catch {}
    }

    const handleLoadStop = async () => {
      await injectFormListener()
      // フォーム送信後のページ遷移でクレデンシャルを取得
      try {
        const creds = await webview.executeJavaScript('window.__pendingCredentials || null')
        if (creds?.username && creds?.password) {
          await webview.executeJavaScript('window.__pendingCredentials = null')
          try {
            const domain = new URL(tabUrl).hostname
            setPendingSave({ domain, username: creds.username, password: creds.password })
          } catch {}
        }
      } catch {}
    }

    webview.addEventListener('did-stop-loading', handleLoadStop)
    return () => webview.removeEventListener('did-stop-loading', handleLoadStop)
  }, [tabUrl])

  const savePassword = useCallback(async () => {
    if (!pendingSave) return
    await invoke('passwords:save', pendingSave)
    setPendingSave(null)
  }, [pendingSave, invoke])

  return {
    pendingSave,
    savePassword,
    dismissSave: () => setPendingSave(null),
  }
}
