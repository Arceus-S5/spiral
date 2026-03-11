const inputEl = document.getElementById('input')
const resultEl = document.getElementById('result')
const resultActions = document.getElementById('resultActions')
const translateBtn = document.getElementById('translateBtn')
const copyBtn = document.getElementById('copyBtn')
const sourceLang = document.getElementById('sourceLang')
const targetLang = document.getElementById('targetLang')
const apiKeyInput = document.getElementById('apiKey')
const saveKeyBtn = document.getElementById('saveKey')
const deeplLink = document.getElementById('deeplLink')
const swapBtn = document.getElementById('swap')

// 保存されたAPIキーを読み込む
chrome.storage.local.get('apiKey', ({ apiKey }) => {
  if (apiKey) apiKeyInput.value = apiKey
})

// 前回の言語設定を復元
chrome.storage.local.get(['sourceLang', 'targetLang'], (data) => {
  if (data.sourceLang) sourceLang.value = data.sourceLang
  if (data.targetLang) targetLang.value = data.targetLang
})

// 選択テキストがあれば自動入力
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return
  chrome.scripting?.executeScript({
    target: { tabId: tabs[0].id },
    func: () => window.getSelection().toString()
  }).then(results => {
    const text = results?.[0]?.result
    if (text && text.trim()) inputEl.value = text.trim()
  }).catch(() => {})
})

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim()
  chrome.storage.local.set({ apiKey: key })
  saveKeyBtn.textContent = '✓ 保存済'
  setTimeout(() => saveKeyBtn.textContent = '保存', 1500)
})

swapBtn.addEventListener('click', () => {
  const srcVal = sourceLang.value === 'auto' ? 'JA' : sourceLang.value
  const tgtVal = targetLang.value
  // 翻訳結果があればテキストエリアに入れ替え
  if (resultEl.textContent && resultEl.style.display !== 'none') {
    inputEl.value = resultEl.textContent
    resultEl.style.display = 'none'
    resultActions.style.display = 'none'
  }
  targetLang.value = srcVal.replace('-US', '').replace('-GB', '')
  sourceLang.value = tgtVal === 'JA' ? 'JA' : 'auto'
})

translateBtn.addEventListener('click', doTranslate)
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doTranslate()
})

async function doTranslate() {
  const text = inputEl.value.trim()
  if (!text) return

  const tgt = targetLang.value
  const src = sourceLang.value

  translateBtn.disabled = true
  translateBtn.textContent = '翻訳中...'
  resultEl.style.display = 'block'
  resultEl.innerHTML = '<span style="color:#888;font-size:12px">翻訳中...</span>'
  resultActions.style.display = 'none'

  // 言語設定を保存
  chrome.storage.local.set({ sourceLang: src, targetLang: tgt })

  chrome.runtime.sendMessage(
    { action: 'translateText', text, targetLang: tgt },
    (response) => {
      translateBtn.disabled = false
      translateBtn.textContent = '翻訳'

      if (response?.success && response.translation) {
        resultEl.textContent = response.translation
        resultActions.style.display = 'flex'
        deeplLink.href = `https://www.deepl.com/translator#auto/ja/${encodeURIComponent(response.translation)}`
      } else {
        // APIキーなし or エラー → DeepLウェブへ
        const encoded = encodeURIComponent(text)
        const langPair = `${src === 'auto' ? 'auto' : src.toLowerCase()}/${tgt.toLowerCase().replace('-us','').replace('-gb','')}`
        resultEl.innerHTML = `
          <span style="color:#888;font-size:12px">APIキーが未設定のためウェブで開きます</span>
        `
        resultActions.style.display = 'flex'
        deeplLink.href = `https://www.deepl.com/translator#${langPair}/${encoded}`
        deeplLink.click()
      }
    }
  )
}

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(resultEl.textContent)
  copyBtn.textContent = '✓ コピー済'
  setTimeout(() => copyBtn.textContent = 'コピー', 1500)
})
