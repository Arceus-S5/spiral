import { useEffect, useRef, memo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useBrowserStore } from '../../store/browserStore'
import { usePasswordDetection, PasswordSaveBanner } from './PasswordManager'
import { INJECT_SCRIPT } from './NotificationHub'
import { useLinkPreview } from './LinkPreview'


// ダークモード強制CSS
const DARK_MODE_SCRIPT = `
(function() {
  if (window.__spiralDarkApplied) return
  window.__spiralDarkApplied = true
  const style = document.createElement('style')
  style.id = '__spiral_dark'
  style.textContent = \`
    @media (prefers-color-scheme: light) {
      :root { color-scheme: dark !important; }
    }
  \`
  document.head.appendChild(style)
  // Chrome Devtools Protocol相当: prefers-color-schemeをdarkに偽装
  try {
    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'dark'
    document.head.appendChild(meta)
  } catch(e) {}
})()
`

// 自動翻訳スクリプト（ページが日本語以外のとき通知バーを表示）
const AUTO_TRANSLATE_SCRIPT = `
(function() {
  if (window.__spiralTranslateChecked) return
  window.__spiralTranslateChecked = true
  const lang = document.documentElement.lang || navigator.language || ''
  const isJa = lang.startsWith('ja') || document.title.match(/[\\u3040-\\u309F\\u30A0-\\u30FF]/)
  if (!isJa && lang && !lang.startsWith('ja')) {
    window.postMessage({ type: '__spiral_translate__', lang, title: document.title, url: location.href }, '*')
  }
})()
`

// PiPスクリプト - Alt+P でPiP切替（YouTubeのオーバーレイ問題を回避）
const PIP_SCRIPT = `
(function() {
  if (window.__spiralPip) return
  window.__spiralPip = true

  async function togglePip() {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(()=>{})
      return
    }
    const videos = [...document.querySelectorAll('video')]
    const target = videos.find(v => !v.paused && v.readyState >= 2) || videos[0]
    if (!target) return
    try { await target.requestPictureInPicture() } catch(e) {}
  }

  // Alt+P でPiP切替
  document.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'p') { e.preventDefault(); togglePip() }
  }, true)

  // videoの右クリックメニューにPiPを追加するのではなく
  // video要素にダブルクリックでPiP（YouTubeはcanvas被さりの問題あり）
  function bindVideo(video) {
    if (video._spiralPip) return
    video._spiralPip = true
    video.title = video.title || 'ダブルクリック or Alt+P でPiP'
  }

  document.querySelectorAll('video').forEach(bindVideo)
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeName === 'VIDEO') bindVideo(n as HTMLVideoElement)
      if ((n as Element).querySelectorAll) (n as Element).querySelectorAll('video').forEach(bindVideo)
    }))
  }).observe(document.documentElement, { childList: true, subtree: true })
})()
`

interface WebViewContainerProps {
  tabId: string
}

export const WebViewContainer = memo(function WebViewContainer({ tabId }: WebViewContainerProps) {
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const updateTab = useBrowserStore(s => s.updateTab)
  const addHistoryEntry = useBrowserStore(s => s.addHistoryEntry)
  const tabUrl = useBrowserStore(s => s.tabs.find(t => t.id === tabId)?.url || '')
  const isPrivate = useBrowserStore(s => s.tabs.find(t => t.id === tabId)?.isPrivate || false)
  // マウント時のURLを取得（タブ復元後に正しいURLが入っているはず）
  const mountUrl = useBrowserStore.getState().tabs.find(t => t.id === tabId)?.url || 'https://www.google.com'
  const srcUrl = (mountUrl && mountUrl !== 'about:blank' && mountUrl !== 'about:newtab')
    ? mountUrl
    : 'https://www.google.com'
  const partitionRef = useRef(isPrivate ? `private-${tabId}` : 'persist:default')

  const { pendingSave, savePassword, dismissSave } = usePasswordDetection(webviewRef, tabUrl)
  const { showPreview, hidePreview } = useLinkPreview()

  // URLの変化を監視してwebviewに直接loadURLする（再マウントしない）
  useEffect(() => {
    // マウント時に現在のURLを確認して必要なら即ロード
    const checkInitialUrl = () => {
      const webview = webviewRef.current
      if (!webview) return
      const storeUrl = useBrowserStore.getState().tabs.find(t => t.id === tabId)?.url
      if (!storeUrl || storeUrl === 'about:blank') return
      const currentSrc = webview.getURL?.() || ''
      if (storeUrl !== currentSrc && currentSrc !== storeUrl) {
        webview.loadURL(storeUrl).catch(() => {})
      }
    }
    // did-attach後に確認
    const timer = setTimeout(checkInitialUrl, 500)

    const unsub = useBrowserStore.subscribe(
      s => s.tabs.find(t => t.id === tabId)?.url,
      (newUrl) => {
        const webview = webviewRef.current
        if (!webview || !newUrl || newUrl === 'about:blank') return
        const currentSrc = webview.getURL?.() || ''
        if (newUrl !== currentSrc) {
          webview.loadURL(newUrl).catch(() => {})
        }
      }
    )
    return () => { clearTimeout(timer); unsub() }
  }, [tabId])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    let loadingTimeout: ReturnType<typeof setTimeout> | null = null

    const clearLoadTimeout = () => {
      if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null }
    }

    const handleLoadStart = () => {
      updateTab(tabId, { isLoading: true })
      clearLoadTimeout()
      loadingTimeout = setTimeout(() => {
        updateTab(tabId, { isLoading: false })
      }, 20000)
    }

    const handleLoadStop = () => {
      clearLoadTimeout()
      updateTab(tabId, { isLoading: false })
    }

    const handleTitleUpdated = (e: any) => {
      updateTab(tabId, { title: e.title })

      // タイトルバッジ監視 — ページタイトルが変わった瞬間に検知
      // Slack: "(3) Slack" / Discord: "(2) #general" / Gmail: "(1) inbox" 等
      const title: string = e.title || ''
      const url = webview.getURL?.() || ''
      if (!url || url === 'about:blank') return

      const m = title.match(/\((\d+)\)/)
      const badge = m ? parseInt(m[1]) : 0
      const prevBadge: number = (webview as any).__spiralPrevBadge ?? 0

      if (badge > prevBadge) {
        // バッジが増えた → 通知
        ;(webview as any).__spiralPrevBadge = badge

        // サービス判定
        const hostname = url
        let service: 'slack' | 'discord' | 'gmail' | 'github' | 'linear' | 'other' = 'other'
        if (hostname.includes('slack.com')) service = 'slack'
        else if (hostname.includes('discord.com')) service = 'discord'
        else if (hostname.includes('mail.google.com')) service = 'gmail'
        else if (hostname.includes('github.com')) service = 'github'
        else if (hostname.includes('linear.app')) service = 'linear'

        const svcLabels: Record<string, string> = {
          slack: 'Slack', discord: 'Discord', gmail: 'Gmail',
          github: 'GitHub', linear: 'Linear', other: 'その他'
        }

        window.postMessage({
          type: '__spiral_notification__',
          title: `${svcLabels[service]}: ${badge} 件の未読`,
          body: title.replace(/^\(\d+\)\s*/, ''),
          icon: '',
          url,
        }, '*')
      } else if (badge === 0) {
        ;(webview as any).__spiralPrevBadge = 0
      }
    }

    const handleFaviconUpdated = (e: any) => {
      if (e.favicons?.[0]) {
        updateTab(tabId, { favicon: e.favicons[0] })
      }
    }

    const handleDidNavigate = (e: any) => {
      const newUrl = e.url
      if (!newUrl || newUrl === 'about:blank') return
      // canGoBack/canGoForwardをwebviewから直接更新
      updateTab(tabId, {
        url: newUrl,
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward(),
      })
      addHistoryEntry({ url: newUrl, title: '' })
    }

    const handleDidNavigateInPage = (e: any) => {
      const newUrl = e.url
      if (!newUrl || newUrl === 'about:blank') return
      updateTab(tabId, {
        url: newUrl,
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward(),
      })
    }

    // 新しいウィンドウ（OAuth以外）を同タブで開く
    // OAuth系はmainプロセスのsetWindowOpenHandlerで処理される
    const handleNewWindow = (e: any) => {
      const url = e.url || e.detail?.url
      if (!url || url === 'about:blank') return
      const isAuthUrl = url.includes('accounts.google.com') ||
        url.includes('oauth') || url.includes('auth') ||
        url.includes('signin') || url.includes('login') ||
        url.includes('slack.com/sign') || url.includes('slack.com/oauth')
      // OAuth系はmainに任せる（preventDefault不要）
      if (!isAuthUrl) {
        e.preventDefault()
        webview.loadURL(url).catch(() => {})
      }
    }
    webview.addEventListener('new-window', handleNewWindow)

    webview.addEventListener('did-start-loading', handleLoadStart)
    webview.addEventListener('did-stop-loading', handleLoadStop)
    webview.addEventListener('page-title-updated', handleTitleUpdated)
    webview.addEventListener('page-favicon-updated', handleFaviconUpdated)
    webview.addEventListener('did-navigate', handleDidNavigate)
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage)


    webview.addEventListener('did-finish-load', () => {
      webview.executeJavaScript(PIP_SCRIPT).catch(() => {})
      webview.executeJavaScript(INJECT_SCRIPT).catch(() => {})
      webview.executeJavaScript(`
        (function() {
          if (window.__spiralLinkHover) return
          window.__spiralLinkHover = true
          let hoverTimer = null
          document.addEventListener('mouseover', e => {
            const a = e.target.closest('a[href]')
            if (!a) return
            const href = a.href
            if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('#')) return
            clearTimeout(hoverTimer)
            hoverTimer = setTimeout(() => {
              window.postMessage({ type: '__spiral_link_hover__', url: href, x: e.clientX, y: e.clientY }, '*')
            }, 500)
          }, true)
          document.addEventListener('mouseout', e => {
            const a = e.target.closest('a[href]')
            if (a) { clearTimeout(hoverTimer); window.postMessage({ type: '__spiral_link_leave__' }, '*') }
          }, true)
        })()
      `).catch(() => {})
    })

    // webviewからのリンクホバーメッセージを受け取る
    const handleWebviewMessage = (e: MessageEvent) => {
      if (e.data?.type === '__spiral_link_hover__') {
        const rect = webview.getBoundingClientRect()
        showPreview(e.data.url, rect.left + e.data.x, rect.top + e.data.y)
      } else if (e.data?.type === '__spiral_link_leave__') {
        hidePreview()
      }
    }
    window.addEventListener('message', handleWebviewMessage)

    return () => {
      clearLoadTimeout()
      webview.removeEventListener('new-window', handleNewWindow)
      webview.removeEventListener('did-start-loading', handleLoadStart)
      webview.removeEventListener('did-stop-loading', handleLoadStop)
      webview.removeEventListener('page-title-updated', handleTitleUpdated)
      webview.removeEventListener('page-favicon-updated', handleFaviconUpdated)
      webview.removeEventListener('did-navigate', handleDidNavigate)
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage)
      window.removeEventListener('message', handleWebviewMessage)
    }
  }, [tabId])

  return (
    <div className="w-full h-full relative">
      <AnimatePresence>
        {pendingSave && (
          <PasswordSaveBanner
            domain={pendingSave.domain}
            username={pendingSave.username}
            password={pendingSave.password}
            onSave={savePassword}
            onDismiss={dismissSave}
          />
        )}
      </AnimatePresence>
      {/* @ts-ignore */}
      <webview
        ref={webviewRef}
        src={srcUrl}
        className="w-full h-full border-none"
        style={{ width: '100%', height: '100%' }}
        data-tabid={tabId}
        allowpopups="true"
        webpreferences="javascript=yes, plugins=yes, allowRunningInsecureContent=yes, webSecurity=no, backgroundThrottling=no, v8CacheOptions=bypassHeatCheck"
        partition={partitionRef.current}
        useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      />
    </div>
  )
})
