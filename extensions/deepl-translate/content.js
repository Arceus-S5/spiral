// 翻訳ポップアップのスタイル
const POPUP_STYLE = `
  position: fixed;
  z-index: 2147483647;
  background: #1a1a2e;
  color: #e8e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
  max-width: 380px;
  min-width: 200px;
  line-height: 1.5;
  backdrop-filter: blur(20px);
  animation: deepl-fade-in 0.15s ease;
`

const STYLE_TAG = `
  @keyframes deepl-fade-in {
    from { opacity: 0; transform: translateY(4px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`

let popup = null
let styleEl = null

function removePopup() {
  if (popup) { popup.remove(); popup = null }
}

function showPopup(text, x, y) {
  removePopup()

  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.textContent = STYLE_TAG
    document.head.appendChild(styleEl)
  }

  popup = document.createElement('div')
  popup.setAttribute('style', POPUP_STYLE)
  popup.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0fa3f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="font-size:11px;color:#888;font-weight:500">DeepL 翻訳中...</span>
      <span id="deepl-close" style="margin-left:auto;cursor:pointer;color:#888;font-size:16px;line-height:1">×</span>
    </div>
    <div id="deepl-result" style="color:#e8e8f0;word-break:break-word"></div>
    <div id="deepl-actions" style="display:none;margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"></div>
  `

  // 画面端からはみ出さないよう位置調整
  popup.style.left = Math.min(x, window.innerWidth - 400) + 'px'
  popup.style.top = (y + 12) + 'px'

  document.body.appendChild(popup)

  popup.querySelector('#deepl-close').addEventListener('click', removePopup)

  return popup
}

// backgroundからのメッセージを受信
chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'translate') return

  const selection = window.getSelection()
  const range = selection.rangeCount > 0 ? selection.getRangeAt(0).getBoundingClientRect() : null
  const x = range ? range.left + window.scrollX : window.innerWidth / 2 - 190
  const y = range ? range.bottom + window.scrollY : window.innerHeight / 2

  const p = showPopup(message.text, x, y)
  const resultEl = p.querySelector('#deepl-result')
  const actionsEl = p.querySelector('#deepl-actions')

  chrome.runtime.sendMessage(
    { action: 'translateText', text: message.text, targetLang: 'JA' },
    (response) => {
      if (!p.isConnected) return

      if (response?.success && response.translation) {
        resultEl.textContent = response.translation

        // アクションボタン
        actionsEl.style.display = 'flex'
        actionsEl.innerHTML = `
          <button id="deepl-copy" style="
            background: rgba(15,163,247,0.15);
            border: 1px solid rgba(15,163,247,0.3);
            color: #0fa3f7;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            font-family: inherit;
          ">コピー</button>
          <a href="https://www.deepl.com/translator#ja/en/${encodeURIComponent(response.translation)}"
            target="_blank"
            style="
              background: transparent;
              border: 1px solid rgba(255,255,255,0.1);
              color: #888;
              padding: 4px 10px;
              border-radius: 6px;
              font-size: 11px;
              cursor: pointer;
              text-decoration: none;
              font-family: inherit;
            ">DeepLで開く</a>
        `
        actionsEl.querySelector('#deepl-copy').addEventListener('click', () => {
          navigator.clipboard.writeText(response.translation)
          actionsEl.querySelector('#deepl-copy').textContent = '✓ コピー済'
        })
      } else {
        // APIキーなし → DeepLウェブへ誘導
        resultEl.innerHTML = `
          <span style="color:#888;font-size:12px">APIキーが未設定です。</span><br>
          <a href="https://www.deepl.com/translator#auto/ja/${encodeURIComponent(message.text)}"
            target="_blank"
            style="color:#0fa3f7;font-size:12px">DeepLウェブで翻訳 →</a>
        `
      }
    }
  )
})

// 外側クリックで閉じる
document.addEventListener('mousedown', (e) => {
  if (popup && !popup.contains(e.target)) removePopup()
})
