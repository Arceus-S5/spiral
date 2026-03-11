import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Shield, Download, Globe, Keyboard,
  Puzzle, ChevronRight, Sun, Moon, Monitor,
  ToggleLeft, ToggleRight, Key, MousePointer
} from 'lucide-react'
import { useBrowserStore } from '../../store/browserStore'
import { useSettings, useAutoUpdater } from '../../hooks/useIpc'
import clsx from 'clsx'
import { PasswordsPanel } from '../browser/PasswordManager'

type SettingsSection = 'appearance' | 'privacy' | 'downloads' | 'search' | 'shortcuts' | 'gestures' | 'extensions' | 'passwords' | 'behavior' | 'help'

const SECTIONS = [
  { id: 'appearance' as SettingsSection, icon: Palette, label: '外観' },
  { id: 'privacy' as SettingsSection, icon: Shield, label: 'プライバシーとセキュリティ' },
  { id: 'downloads' as SettingsSection, icon: Download, label: 'ダウンロード' },
  { id: 'search' as SettingsSection, icon: Globe, label: '検索' },
  { id: 'shortcuts' as SettingsSection, icon: Keyboard, label: 'ショートカット' },
  { id: 'gestures' as SettingsSection, icon: ToggleRight, label: 'マウスジェスチャー' },
  { id: 'behavior' as SettingsSection, icon: MousePointer, label: 'タブと操作' },
  { id: 'extensions' as SettingsSection, icon: Puzzle, label: '拡張機能' },
  { id: 'passwords' as SettingsSection, icon: Key, label: 'パスワード' },
  { id: 'help' as SettingsSection, icon: ChevronRight, label: '機能一覧' },
]

const THEMES = [
  { id: 'light', icon: Sun, label: 'ライト', preview: ['#f5f3ff', '#ece9f8'] },
  { id: 'dark', icon: Moon, label: 'ダーク', preview: ['#1e1630', '#160f25'] },
  { id: 'midnight', icon: Monitor, label: 'Midnight', preview: ['#1a1f2e', '#0d1117'] },
  { id: 'rose', icon: Palette, label: 'Rosé', preview: ['#fdf0f3', '#fae8ed'] },
  { id: 'sakura', icon: Palette, label: 'さくら', preview: ['#fde8f0', '#f5cfe2'] },
]

const SPACE_COLORS = [
  '#6B4FE8', '#3B82F6', '#E8567A', '#10B981',
  '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  '#EC4899', '#84CC16',
]

const SECTION_TRANSITION = { duration: 0.1, ease: 'easeOut' }

export function SettingsPanel() {
  const [section, setSection] = useState<SettingsSection>('appearance')
  const { settings, setTheme, theme } = useBrowserStore()
  const { updateSettings } = useSettings()
  const { updateState, checkForUpdates, downloadUpdate, installAndRestart } = useAutoUpdater()

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>設定を読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 pb-2 flex-shrink-0">
        {SECTIONS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={clsx(
              'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors',
              section === id
                ? 'bg-[var(--cmdk-item-active)] text-[var(--accent-primary)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-secondary)]'
            )}
          >
            <Icon size={13} />
            {label}
            {section === id && <ChevronRight size={11} className="ml-auto" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <AnimatePresence mode="wait">
          {section === 'appearance' && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
            >
              {/* テーマ選択 */}
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>テーマ</div>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {THEMES.map(({ id, icon: Icon, label, preview }) => (
                  <button
                    key={id}
                    onClick={() => { setTheme(id); updateSettings({ theme: id as any }) }}
                    className={clsx(
                      'flex flex-col items-start rounded-xl overflow-hidden transition-all text-left',
                      theme === id
                        ? 'ring-2 ring-[var(--accent-primary)] shadow-lg'
                        : 'ring-1 ring-[var(--border)] hover:ring-[var(--accent-primary)] hover:ring-opacity-50'
                    )}
                  >
                    {/* Preview swatch */}
                    <div
                      className="w-full h-10 flex items-end px-2 pb-1.5"
                      style={{
                        background: `linear-gradient(135deg, ${preview[0]} 0%, ${preview[1]} 100%)`
                      }}
                    >
                      <div className="flex gap-1">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-1.5 rounded-full opacity-40"
                            style={{ width: i === 1 ? 20 : i === 2 ? 14 : 10, background: 'var(--accent-primary)' }} />
                        ))}
                      </div>
                    </div>
                    <div className={clsx(
                      'flex items-center gap-1.5 w-full px-2.5 py-1.5',
                      theme === id
                        ? 'bg-[var(--cmdk-item-active)] text-[var(--accent-primary)]'
                        : 'bg-[var(--cmdk-input-bg)] text-[var(--text-secondary)]'
                    )}>
                      <Icon size={11} />
                      <span className="text-xs">{label}</span>
                      {theme === id && <div className="ml-auto w-2 h-2 rounded-full bg-[var(--accent-primary)]" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Space カラー */}
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Space カラー</div>
              <div className="flex flex-wrap gap-2 mb-5">
                {SPACE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      document.documentElement.style.setProperty('--space-color', color)
                      updateSettings({ spaceColor: color } as any)
                    }}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95"
                    style={{
                      background: color,
                      boxShadow: `0 0 0 2px var(--cmdk-bg), 0 0 0 4px ${color}55`,
                    }}
                    title={color}
                  />
                ))}
                {/* カスタムカラー */}
                <label
                  className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  style={{ background: 'var(--cmdk-input-bg)', border: '1.5px dashed var(--border)' }}
                  title="カスタムカラー"
                >
                  <Palette size={12} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="color"
                    className="sr-only"
                    onChange={e => {
                      document.documentElement.style.setProperty('--space-color', e.target.value)
                      updateSettings({ spaceColor: e.target.value } as any)
                    }}
                  />
                </label>
              </div>

              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>カスタム CSS</div>
              <textarea
                className="w-full rounded-lg p-2.5 text-xs font-mono outline-none resize-none"
                style={{
                  background: 'var(--cmdk-input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  height: '120px'
                }}
                placeholder="/* Your custom CSS here */&#10;body { font-size: 16px; }"
                defaultValue={settings.customTheme?.customCSS || ''}
                onChange={e => updateSettings({
                  customTheme: { ...settings.customTheme, customCSS: e.target.value } as any
                })}
              />

              {/* 強制ダークモード */}
              <div className="mt-4">
                <ToggleSetting
                  label="ウェブサイトを強制ダーク表示"
                  description="全てのサイトにダークモードを強制適用"
                  value={(settings as any).forceDarkMode || false}
                  onChange={v => {
                    updateSettings({ forceDarkMode: v } as any)
                    // webviewに即時反映するためにIPCで通知
                    ;(window as any).electronAPI?.invoke?.('settings:forceDarkMode', v)
                  }}
                />
              </div>
            </motion.div>
          )}

          {section === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
              className="flex flex-col gap-3"
            >
              {/* デフォルトブラウザ設定 */}
              <div className="p-3 rounded-xl" style={{ background: 'var(--cmdk-input-bg)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>デフォルトブラウザ</div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>リンクをSpiralで開くように設定します</div>
                <button
                  onClick={() => (window as any).electronAPI?.invoke?.('app:setAsDefaultBrowser')}
                  className="w-full text-xs py-2 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                  Spiralをデフォルトブラウザに設定
                </button>
              </div>

              {/* 自動アップデート */}
              <div className="p-3 rounded-xl" style={{ background: 'var(--cmdk-input-bg)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>アップデート</div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {updateState.status === 'idle' && 'GitHub Releasesから自動更新します'}
                  {updateState.status === 'checking' && '最新バージョンを確認中...'}
                  {updateState.status === 'upToDate' && '✓ 最新バージョンです'}
                  {updateState.status === 'available' && `🆕 v${updateState.version} が利用可能です`}
                  {updateState.status === 'downloading' && `ダウンロード中... ${updateState.percent}%`}
                  {updateState.status === 'downloaded' && `✓ v${updateState.version} のダウンロード完了`}
                  {updateState.status === 'error' && `エラー: ${updateState.error}`}
                </div>
                {updateState.status === 'downloading' && (
                  <div className="w-full h-1.5 rounded-full mb-2" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${updateState.percent}%`, background: 'var(--accent-primary)' }} />
                  </div>
                )}
                <div className="flex gap-2">
                  {(updateState.status === 'idle' || updateState.status === 'upToDate' || updateState.status === 'error') && (
                    <button
                      onClick={checkForUpdates}
                      className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
                      style={{ background: 'var(--sidebar-hover)', color: 'var(--text-primary)' }}
                    >
                      更新を確認
                    </button>
                  )}
                  {updateState.status === 'available' && (
                    <button
                      onClick={downloadUpdate}
                      className="flex-1 text-xs py-1.5 rounded-lg font-medium"
                      style={{ background: 'var(--accent-primary)', color: 'white' }}
                    >
                      ダウンロード
                    </button>
                  )}
                  {updateState.status === 'downloaded' && (
                    <button
                      onClick={installAndRestart}
                      className="flex-1 text-xs py-1.5 rounded-lg font-medium"
                      style={{ background: 'var(--accent-primary)', color: 'white' }}
                    >
                      再起動してインストール
                    </button>
                  )}
                </div>
              </div>
              <ToggleSetting
                label="Ad Blocker"
                description="広告ドメインをブロック"
                value={settings.adBlockEnabled}
                onChange={v => updateSettings({ adBlockEnabled: v })}
              />
              <ToggleSetting
                label="Tracker Blocker"
                description="アナリティクストラッカーをブロック"
                value={settings.trackerBlockEnabled}
                onChange={v => updateSettings({ trackerBlockEnabled: v })}
              />
              <div>
                <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Cookie ポリシー
                </div>
                {[
                  { value: 'allow-all', label: 'すべて許可' },
                  { value: 'block-third-party', label: 'サードパーティをブロック' },
                  { value: 'block-all', label: 'すべてブロック' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ cookiePolicy: opt.value as any })}
                    className={clsx(
                      'flex items-center w-full px-3 py-2 rounded-lg text-xs mb-1 transition-colors',
                      settings.cookiePolicy === opt.value
                        ? 'bg-[var(--cmdk-item-active)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]'
                    )}
                  >
                    <div className={clsx('w-3 h-3 rounded-full border mr-2 flex-shrink-0',
                      settings.cookiePolicy === opt.value ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border)]'
                    )} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {section === 'downloads' && (
            <motion.div
              key="downloads"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
              className="flex flex-col gap-3"
            >
              <ToggleSetting
                label="保存先を毎回確認"
                description="ダウンロード時にダイアログを表示"
                value={settings.askDownloadLocation}
                onChange={v => updateSettings({ askDownloadLocation: v })}
              />
              <div>
                <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  デフォルト保存先
                </div>
                <div
                  className="text-xs px-3 py-2 rounded-lg truncate"
                  style={{ background: 'var(--cmdk-input-bg)', color: 'var(--text-secondary)' }}
                >
                  {settings.defaultDownloadPath}
                </div>
              </div>
            </motion.div>
          )}

          {section === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
            >
              <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                デフォルト検索エンジン
              </div>
              {[
                { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
                { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
                { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
                { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=%s' },
              ].map(engine => (
                <button
                  key={engine.id}
                  onClick={() => updateSettings({ defaultSearchEngine: { ...engine, keyword: engine.id[0], isDefault: true } })}
                  className={clsx(
                    'flex items-center w-full px-3 py-2 rounded-lg text-xs mb-1 transition-colors',
                    settings.defaultSearchEngine?.id === engine.id
                      ? 'bg-[var(--cmdk-item-active)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]'
                  )}
                >
                  <div className={clsx('w-3 h-3 rounded-full border mr-2 flex-shrink-0',
                    settings.defaultSearchEngine?.id === engine.id ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border)]'
                  )} />
                  {engine.name}
                </button>
              ))}
            </motion.div>
          )}

          {section === 'shortcuts' && (
            <motion.div
              key="shortcuts"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
            >
              <ShortcutEditor />
            </motion.div>
          )}

          {section === 'gestures' && (
            <motion.div
              key="gestures"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
            >
              <GestureSettings />
            </motion.div>
          )}

          {section === 'behavior' && (
            <motion.div
              key="behavior"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
              className="flex flex-col gap-3"
            >
              <BehaviorSettings settings={settings} updateSettings={updateSettings} />
            </motion.div>
          )}

          {section === 'extensions' && (
            <motion.div
              key="extensions"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
            >
              <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
                Chrome 拡張機能は CLI から読み込めます。<br />
                <span className="text-[10px] opacity-70">
                  インストール済みの拡張機能はここに表示されます。
                </span>
              </p>
            </motion.div>
          )}
          {section === 'help' && (
            <motion.div
              key="help"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
            >
              <HelpSection />
            </motion.div>
          )}

          {section === 'passwords' && (
            <motion.div
              key="passwords"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SECTION_TRANSITION}
            >
              <PasswordsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ToggleSetting({ label, description, value, onChange }: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {description && (
          <div className="text-xs opacity-60" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="flex-shrink-0"
        style={{ color: value ? 'var(--accent-primary)' : 'var(--text-muted)' }}
      >
        {value ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </button>
    </div>
  )
}

// ショートカット編集コンポーネント
const DEFAULT_SHORTCUTS: Record<string, string> = {
  newTab: '⌘T',
  closeTab: '⌘W',
  commandPalette: '⌘K',
  reloadTab: '⌘R',
  focusAddressBar: '⌘L',
  toggleSidebar: '⌘\\',
  immersiveMode: '⌘B',
  splitView: '⌘⇧S',
  screenshot: '⌘⇧4',
  devTools: '⌘⌥I',
}

const SHORTCUT_LABELS: Record<string, string> = {
  newTab: '新しいタブ',
  closeTab: 'タブを閉じる',
  commandPalette: 'コマンドパレット',
  reloadTab: '再読み込み',
  focusAddressBar: 'アドレスバー',
  toggleSidebar: 'サイドバー切替',
  immersiveMode: '没入モード',
  splitView: 'Split View',
  screenshot: 'スクリーンショット',
  devTools: '開発者ツール',
}

function ShortcutEditor() {
  const { settings, setSettings } = useBrowserStore()
  const [recording, setRecording] = useState<string | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') { setRecording(null); return }
    const parts: string[] = []
    if (e.metaKey) parts.push('⌘')
    if (e.ctrlKey) parts.push('⌃')
    if (e.altKey) parts.push('⌥')
    if (e.shiftKey) parts.push('⇧')
    const k = e.key
    if (['Meta','Control','Alt','Shift'].includes(k)) return
    parts.push(k.length === 1 ? k.toUpperCase() : k)
    const combo = parts.join('')
    const cur = { ...(settings.shortcuts || {}), [key]: combo }
    setSettings({ ...settings!, shortcuts: cur })
    setRecording(null)
  }

  return (
    <div>
      <p className="text-xs mb-3 opacity-60" style={{ color: 'var(--text-muted)' }}>
        キーをクリックして新しいショートカットを入力
      </p>
      {Object.keys(DEFAULT_SHORTCUTS).map(key => {
        const current = settings.shortcuts?.[key] || DEFAULT_SHORTCUTS[key]
        const isRec = recording === key
        return (
          <div key={key} className="flex items-center justify-between py-2"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {SHORTCUT_LABELS[key]}
            </span>
            <kbd
              tabIndex={0}
              onKeyDown={isRec ? (e) => handleKeyDown(e, key) : undefined}
              onClick={() => setRecording(isRec ? null : key)}
              className="text-xs px-2 py-0.5 rounded-md cursor-pointer select-none"
              style={{
                background: isRec ? 'var(--accent-primary)' : 'var(--sidebar-hover)',
                color: isRec ? 'white' : 'var(--text-muted)',
                border: `1px solid ${isRec ? 'var(--accent-primary)' : 'var(--border)'}`,
                outline: 'none',
                minWidth: 48, textAlign: 'center',
              }}
            >
              {isRec ? '⌨️ 入力...' : current}
            </kbd>
          </div>
        )
      })}
      <button
        onClick={() => setSettings({ ...settings!, shortcuts: DEFAULT_SHORTCUTS })}
        className="mt-3 text-xs px-3 py-1.5 rounded-lg"
        style={{ color: 'var(--text-muted)', background: 'var(--sidebar-hover)' }}
      >
        デフォルトに戻す
      </button>
    </div>
  )
}

// マウスジェスチャー設定
const DEFAULT_GESTURES: Record<string, string> = {
  '←': '戻る',
  '→': '進む',
  '↑': 'リロード',
  '↓': '新しいタブ',
  '↗': 'タブを閉じる',
}

function GestureSettings() {
  const { settings, setSettings } = useBrowserStore()
  const actions = ['戻る', '進む', 'リロード', '新しいタブ', 'タブを閉じる', 'なし']
  const gestures = (settings as any).gestures || DEFAULT_GESTURES

  return (
    <div>
      <p className="text-xs mb-3 opacity-60" style={{ color: 'var(--text-muted)' }}>
        右ドラッグでジェスチャー操作。方向ごとにアクションを設定できます。
      </p>
      {Object.keys(DEFAULT_GESTURES).map(dir => (
        <div key={dir} className="flex items-center justify-between py-2"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', minWidth: 32 }}>{dir}</span>
          <select
            value={gestures[dir] || DEFAULT_GESTURES[dir]}
            onChange={e => setSettings({ ...settings!, gestures: { ...gestures, [dir]: e.target.value } } as any)}
            className="text-xs px-2 py-1 rounded-md"
            style={{
              background: 'var(--sidebar-hover)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              outline: 'none',
            }}
          >
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

// 機能一覧
function HelpSection() {
  const features = [
    {
      category: 'タブ操作',
      items: [
        { label: '新しいタブ', key: '⌘T' },
        { label: 'タブを閉じる', key: '⌘W' },
        { label: '次のタブ', key: '⌃Tab' },
        { label: '前のタブ', key: '⌃⇧Tab' },
        { label: 'タブをピン留め', key: 'サイドバーで右クリック' },
        { label: 'Split View', key: 'ツールバーの⊞ボタン' },
      ]
    },
    {
      category: 'ナビゲーション',
      items: [
        { label: 'アドレスバー', key: '⌘L' },
        { label: 'コマンドパレット', key: '⌘K' },
        { label: '戻る / 進む', key: '⌘[ / ⌘]' },
        { label: '再読み込み', key: '⌘R' },
        { label: '強制再読み込み', key: '⌘⇧R' },
      ]
    },
    {
      category: '表示・UI',
      items: [
        { label: '没入モード（UIを全て隠す）', key: '⌘B' },
        { label: 'サイドバー開閉', key: 'サイドバーの矢印' },
        { label: 'ズームイン / アウト', key: '⌘+ / ⌘-' },
        { label: 'ズームリセット', key: '⌘0' },
      ]
    },
    {
      category: 'ツール',
      items: [
        { label: 'スクリーンショット', key: 'ツールバー左のカメラ or ⌘⇧4' },
        { label: 'ライブラリ（履歴/ブックマーク）', key: 'サイドバーのカバン' },
        { label: 'パスワードマネージャー', key: '設定 → パスワード' },
        { label: 'PiP（動画）', key: 'ツールバー⊡ボタン or Alt+P' },
        { label: 'クイックメモ', key: 'サイドバーのメモアイコン' },
      ]
    },
    {
      category: 'マウスジェスチャー（右ドラッグ）',
      items: [
        { label: '← ドラッグ', key: '戻る' },
        { label: '→ ドラッグ', key: '進む' },
        { label: '↑ ドラッグ', key: 'リロード' },
        { label: '↓ ドラッグ', key: '新しいタブ' },
        { label: '↗ ドラッグ', key: 'タブを閉じる' },
      ]
    },
    {
      category: 'ウェブサイト強制ダークモード',
      items: [
        { label: '設定 → 外観 → 強制ダーク表示', key: 'トグルをON' },
      ]
    },
  ]

  return (
    <div className="space-y-4">
      {features.map(group => (
        <div key={group.category}>
          <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent-primary)' }}>
            {group.category}
          </div>
          {group.items.map(item => (
            <div key={item.label} className="flex items-center justify-between py-1.5"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              <kbd className="text-xs px-2 py-0.5 rounded-md flex-shrink-0 ml-2"
                style={{
                  background: 'var(--sidebar-hover)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontSize: '10px',
                  maxWidth: '160px',
                  textAlign: 'right',
                }}>
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// タブと操作の設定
// ============================================================
function BehaviorSettings({ settings, updateSettings }: {
  settings: any
  updateSettings: (s: any) => void
}) {
  const tb = settings?.tabBehavior || {}

  const updateBehavior = (key: string, value: boolean) => {
    updateSettings({
      tabBehavior: { ...tb, [key]: value }
    })
  }

  const items: { key: string; label: string; description: string }[] = [
    { key: 'doubleClickToClose',   label: 'ダブルクリックでタブを閉じる',   description: 'タブをダブルクリックすると閉じる' },
    { key: 'middleClickToClose',   label: 'ミドルクリックでタブを閉じる',   description: 'マウスホイールクリックで閉じる' },
    { key: 'switchTabOnScroll',    label: 'サイドバーでスクロールして切り替え', description: 'サイドバー上でスクロールするとタブが切り替わる' },
    { key: 'closeTabOnSwipeLeft',  label: '左スワイプでタブを閉じる',       description: 'タッチパッドで左スワイプすると閉じる' },
    { key: 'confirmBeforeClose',   label: '複数タブを閉じる前に確認',       description: '2つ以上開いている場合に確認ダイアログ' },
    { key: 'restoreLastSession',   label: '前回のセッションを復元',         description: '起動時に前回開いていたタブを復元する' },
    { key: 'openLinkInBackground', label: 'リンクをバックグラウンドで開く', description: '新しいタブを開いても現在のタブにとどまる' },
    { key: 'showTabPreviewOnHover', label: 'タブホバーでプレビュー表示',    description: 'タブにマウスを乗せると内容をプレビュー' },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>タブの動作</div>
      {items.map(item => (
        <ToggleSetting
          key={item.key}
          label={item.label}
          description={item.description}
          value={tb[item.key] ?? false}
          onChange={v => updateBehavior(item.key, v)}
        />
      ))}
    </div>
  )
}
