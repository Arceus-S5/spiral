// コンテキストメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'deepl-translate',
    title: 'DeepLで翻訳',
    contexts: ['selection']
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'deepl-translate' && info.selectionText) {
    // コンテンツスクリプトに翻訳リクエストを送信
    chrome.tabs.sendMessage(tab.id, {
      action: 'translate',
      text: info.selectionText
    })
  }
})

// ポップアップからのメッセージを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'translateText') {
    translateWithDeepL(message.text, message.targetLang || 'JA')
      .then(result => sendResponse({ success: true, translation: result }))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true // 非同期レスポンス
  }
})

async function translateWithDeepL(text, targetLang) {
  const { apiKey } = await chrome.storage.local.get('apiKey')

  // APIキーがない場合はDeepL無料API（制限あり）を使用
  if (!apiKey) {
    // APIキーなしでDeepLウェブサイトにリダイレクト
    return null
  }

  const isFreePlan = apiKey.endsWith(':fx')
  const endpoint = isFreePlan
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
    })
  })

  if (!response.ok) throw new Error(`DeepL API error: ${response.status}`)
  const data = await response.json()
  return data.translations[0].text
}
