// ============================================================
// Notification Hub — Discord / Slack / Gmail / GitHub を一元管理
// スマートフィルタリング:
//   Slack   → メンション・DM・キーワードのみ
//   Discord → メンション・DM・リプライのみ
//   Gmail   → 新着メールのみ
//   GitHub  → レビュー依頼・メンション・assignのみ
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, X, ExternalLink, Check, CheckCheck,
  Trash2, Settings, RefreshCw
} from 'lucide-react'
import type { HubNotification } from '@shared/types'
import { useNavigate } from '../../hooks/useIpc'
import { useBrowserStore } from '../../store/browserStore'
import clsx from 'clsx'

// --- サービス定義 ---
const SERVICES = {
  discord: {
    label: 'Discord',
    color: '#5865F2',
    urlPattern: /discord\.com/,
    iconSvg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
      </svg>
    ),
  },
  slack: {
    label: 'Slack',
    color: '#4A154B',
    urlPattern: /slack\.com/,
    iconSvg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
  },
  gmail: {
    label: 'Gmail',
    color: '#EA4335',
    urlPattern: /mail\.google\.com/,
    iconSvg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    color: '#24292F',
    urlPattern: /github\.com/,
    iconSvg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
  linear: {
    label: 'Linear',
    color: '#5E6AD2',
    urlPattern: /linear\.app/,
    iconSvg: (
      <svg width="14" height="14" viewBox="0 0 100 100" fill="currentColor">
        <path d="M1.22541 61.5228c-.16-.6236.87-1.3245 1.44-.75l36.5776 36.5776c.574.5745-.1265 1.6031-.75 1.44C20.0449 94.2237 5.7762 79.955 1.22541 61.5228zM.00189 46.8891c-.01648 1.1822.38436 2.5649 1.38063 3.5612L49.6382 98.6177c.9963.9963 2.379 1.3973 3.5612 1.3807C74.2696 99.2512 99.2514 74.2693 99.6322 53.0001c.0165-1.1822-.3844-2.565-1.3807-3.5612L50.062 1.28085c-.9963-.99627-2.379-1.39711-3.5612-1.380632C25.1309.527793.356617 25.7584.00189 46.8891zM7.53309 84.0014C16.2622 93.6131 27.3947 99.0869 39.0554 99.5806L99.5807 39.0553c-.4937-11.6607-5.9675-22.7932-15.5792-31.5223L7.53309 84.0014zM58.0834.00731c-1.1822.01648-2.565.38436-3.5612 1.38063l-3.57 3.57C71.7219.346523 99.6534 28.2781 95.0421 48.5478l3.57-3.57c.9963-.9963 1.3973-2.379 1.3807-3.5612C99.6543 19.2016 80.7985.33948 58.0834.00731z"/>
      </svg>
    ),
  },
  other: {
    label: 'その他',
    color: '#98989D',
    urlPattern: null,
    iconSvg: <Bell size={14} />,
  },
}

// --- ウェブページの通知を傍受してHubに追加する注入スクリプト ---
// サービスごとにフィルタリング:
//   Slack:   メンション(@)・DM・キーワード通知のみ
//   Discord: メンション(@)・DM・リプライのみ
//   Gmail:   新着メールのみ（チャットは除外）
//   GitHub:  レビュー依頼・メンション・assign のみ
const INJECT_SCRIPT = `
(function() {
  if (window.__spiralHubInjected) return;
  window.__spiralHubInjected = true;

  // =====================================================
  // visibilityState を常に 'visible' に偽装
  // =====================================================
  try {
    Object.defineProperty(document, 'visibilityState', {
      get: function() { return 'visible'; }, configurable: true
    });
    Object.defineProperty(document, 'hidden', {
      get: function() { return false; }, configurable: true
    });
  } catch(e) {}

  // =====================================================
  // Service Worker の showNotification を傍受
  // Slack / Discord はこちら経由で通知を出す
  // =====================================================
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function(reg) {
      var origShow = reg.showNotification.bind(reg);
      reg.showNotification = function(title, opts) {
        try {
          window.postMessage({
            type: '__spiral_notification__',
            title: title,
            body: (opts && opts.body) || '',
            icon: (opts && opts.icon) || '',
            url: window.location.href,
          }, '*');
        } catch(e) {}
        return origShow(title, opts);
      };
    }).catch(function() {});

    // Service Worker からの push メッセージも監視
    navigator.serviceWorker.addEventListener('message', function(e) {
      var d = e.data;
      if (!d) return;
      var title = d.title || d.notification && d.notification.title || '';
      var body  = d.body  || d.notification && d.notification.body  || '';
      if (title) {
        window.postMessage({
          type: '__spiral_notification__',
          title: title,
          body: body,
          icon: '',
          url: window.location.href,
        }, '*');
      }
    });
  }

  // =====================================================
  // window.Notification も一応フック（Gmail等）
  // =====================================================
  var origNotif = window.Notification;
  if (origNotif) {
    var NewNotif = function(title, opts) {
      var n = new origNotif(title, opts);
      try {
        window.postMessage({
          type: '__spiral_notification__',
          title: title,
          body: (opts && opts.body) || '',
          icon: (opts && opts.icon) || '',
          url: window.location.href,
        }, '*');
      } catch(e) {}
      return n;
    };
    NewNotif.prototype = origNotif.prototype;
    Object.setPrototypeOf(NewNotif, origNotif);
    Object.assign(NewNotif, origNotif);
    Object.defineProperty(NewNotif, 'permission', {
      get: function() { return 'granted'; }, configurable: true
    });
    NewNotif.requestPermission = function() {
      return Promise.resolve('granted');
    };
    try { window.Notification = NewNotif; } catch(e) {}
  }
})();
`

// --- タブごとの未読バッジ数を pageTitle の "(N)" から読む ---
function detectBadge(title: string): number {
  const m = title.match(/\((\d+)\)/)
  return m ? parseInt(m[1]) : 0
}

function detectService(url: string): HubNotification['service'] {
  for (const [key, def] of Object.entries(SERVICES)) {
    if (def.urlPattern && def.urlPattern.test(url)) {
      return key as HubNotification['service']
    }
  }
  return 'other'
}

// ============================================================
// メインコンポーネント
// ============================================================
interface NotificationHubProps {
  onClose: () => void
}

export function NotificationHub({ onClose }: NotificationHubProps) {
  const [filter, setFilter] = useState<HubNotification['service'] | 'all'>('all')
  const { navigate } = useNavigate()

  const notifications = useBrowserStore(s => s.hubNotifications)
  const markOne = useBrowserStore(s => s.markHubNotificationRead)
  const markAll = useBrowserStore(s => s.markAllHubNotificationsRead)
  const removeOne = useBrowserStore(s => s.removeHubNotification)
  const clearAll = useBrowserStore(s => s.clearHubNotifications)

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.service === filter)

  const unreadCount = notifications.filter(n => n.unread).length

  const serviceCounts = notifications.reduce((acc, n) => {
    acc[n.service] = (acc[n.service] || 0) + (n.unread ? 1 : 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.96 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', right: 12, top: 52, bottom: 12,
        width: 340, zIndex: 99990,
        display: 'flex', flexDirection: 'column',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: 'var(--cmdk-shadow)',
        background: 'var(--cmdk-bg)',
        border: '1px solid var(--cmdk-border)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <Bell size={14} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          通知
          {unreadCount > 0 && (
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 99,
              background: 'var(--accent-primary)', color: 'white',
            }}>{unreadCount}</span>
          )}
        </span>
        <button onClick={markAll} title="すべて既読"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 3 }}>
          <CheckCheck size={13} />
        </button>
        <button onClick={clearAll} title="すべて削除"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 3 }}>
          <Trash2 size={13} />
        </button>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 3 }}>
          <X size={14} />
        </button>
      </div>

      {/* Service filter tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '8px 10px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0, overflowX: 'auto',
      }}>
        {[{ id: 'all', label: 'すべて' }, ...Object.entries(SERVICES).map(([id, s]) => ({ id, label: s.label }))].map(({ id, label }) => {
          const count = id === 'all' ? unreadCount : (serviceCounts[id] || 0)
          return (
            <button key={id}
              onClick={() => setFilter(id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 9px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 500,
                flexShrink: 0,
                background: filter === id ? 'var(--cmdk-item-active)' : 'transparent',
                color: filter === id ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}>
              {id !== 'all' && (
                <span style={{ color: SERVICES[id as keyof typeof SERVICES]?.color }}>
                  {SERVICES[id as keyof typeof SERVICES]?.iconSvg}
                </span>
              )}
              {label}
              {count > 0 && (
                <span style={{
                  fontSize: 9, padding: '0 4px', borderRadius: 99, minWidth: 14,
                  background: filter === id ? 'var(--accent-primary)' : 'var(--border)',
                  color: filter === id ? 'white' : 'var(--text-muted)',
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            color: 'var(--text-muted)',
          }}>
            <Bell size={28} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: 12 }}>通知はありません</span>
          </div>
        ) : (
          filtered.map(n => {
            const svc = SERVICES[n.service]
            return (
              <div key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px',
                  background: n.unread ? `rgba(var(--space-color-rgb,107,79,232),0.05)` : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.08s',
                }}
                onClick={() => { markOne(n.id); if (n.url) navigate(n.url) }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--cmdk-item-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.unread ? `rgba(var(--space-color-rgb,107,79,232),0.05)` : 'transparent'}
              >
                {/* Service icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: svc.color + '22',
                  color: svc.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {svc.iconSvg}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
                  }}>
                    {n.unread && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: svc.color, flexShrink: 0 }} />
                    )}
                    <span style={{
                      fontSize: 12, fontWeight: n.unread ? 600 : 400,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>{n.title}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatTime(n.timestamp)}
                    </span>
                  </div>
                  {n.body && (
                    <p style={{
                      margin: 0, fontSize: 11, color: 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{n.body}</p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => markOne(n.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                    <Check size={11} />
                  </button>
                  <button onClick={() => removeOne(n.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                    <X size={11} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{
        padding: '8px 14px', borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text-muted)', flexShrink: 0,
      }}>
        Slack・Discord: メンション/DMのみ　Gmail: 新着メールのみ　GitHub: レビュー依頼のみ
      </div>
    </motion.div>
  )
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '今'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`
  return `${Math.floor(diff / 86400000)}日前`
}

// INJECT_SCRIPTをWebViewContainerから使えるようにエクスポート
export { INJECT_SCRIPT }

// ---- トースト通知（画面右下に一時表示） ----
interface ToastNotif {
  id: string
  service: HubNotification['service']
  title: string
  body: string
  url: string
}

function NotificationToast({ notif, onClose }: { notif: ToastNotif; onClose: () => void }) {
  const { navigate } = useNavigate()
  const svc = SERVICES[notif.service]

  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => { onClose(); if (notif.url) navigate(notif.url) }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'var(--cmdk-bg)',
        border: '1px solid var(--cmdk-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        cursor: 'pointer',
        width: 300,
        maxWidth: '90vw',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: svc.color + '22', color: svc.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {svc.iconSvg}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          {svc.label}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{notif.title}</div>
        {notif.body && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{notif.body}</div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}
      >
        <X size={12} />
      </button>
    </motion.div>
  )
}

// ---- ベルボタン（ツールバーに埋め込む用） ----
export function NotificationBell() {
  const [show, setShow] = useState(false)
  const [toasts, setToasts] = useState<ToastNotif[]>([])
  const { navigate } = useNavigate()

  const unreadCount = useBrowserStore(s => s.hubNotifications.filter(n => n.unread).length)
  const addHubNotification = useBrowserStore(s => s.addHubNotification)
  const markAllRead = useBrowserStore(s => s.markAllHubNotificationsRead)

  // タイトルバッジ変化 + バックグラウンド通知 を両方受け取る
  // （タイトルバッジはWebViewContainerのpage-title-updatedから postMessage で送られてくる）
  useEffect(() => {
    // ① mainプロセス経由（確実・タブアクティブ問わず）
    const removeIpc = (window as any).electronAPI?.on('notification:from-webview', (data: any) => {
      const url: string = data.url || ''
      const service = detectService(url)
      addHubNotification({ service, title: data.title || '', body: data.body || '', url, unread: true })
      setToasts(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        service, title: data.title || '', body: data.body || '', url,
      }].slice(-4))
    })

    // ② webview postMessage経由（バックグラウンドタブのwindow.Notification）
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== '__spiral_notification__') return
      const url: string = e.data.url || ''
      const service = detectService(url)
      addHubNotification({ service, title: e.data.title || '', body: e.data.body || '', url, unread: true })
      setToasts(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        service, title: e.data.title || '', body: e.data.body || '', url,
      }].slice(-4))
    }
    window.addEventListener('message', handler)

    return () => {
      removeIpc?.()
      window.removeEventListener('message', handler)
    }
  }, [addHubNotification])

  const removeToast = (id: string) => setToasts(p => p.filter(t => t.id !== id))

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          onClick={() => { setShow(p => !p); if (!show) markAllRead() }}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: 'none', cursor: 'pointer',
            background: show ? 'var(--cmdk-item-active)' : 'transparent',
            color: show ? 'var(--accent-primary)' : 'var(--text-muted)',
            transition: 'all 0.08s',
          }}
          title="通知ハブ (⌘⇧B)"
        >
          <Bell size={14} />
        </button>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 14, height: 14, borderRadius: 99,
                background: 'var(--accent-primary)', color: 'white',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', pointerEvents: 'none',
              }}
            >{unreadCount > 99 ? '99+' : unreadCount}</motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* トースト通知（右下固定） */}
      <div style={{
        position: 'fixed', bottom: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 99999, pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <NotificationToast notif={t} onClose={() => removeToast(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {show && <NotificationHub onClose={() => setShow(false)} />}
      </AnimatePresence>
    </>
  )
}
