// ============================================================
// BlocklistManager - 広告・トラッカーブロック
// ============================================================

interface BlockOptions {
  adBlock: boolean
  trackerBlock: boolean
}

// よく使われる広告・トラッカードメインのパターン
const AD_PATTERNS: RegExp[] = [
  /doubleclick\.net/,
  /googlesyndication\.com/,
  /googleadservices\.com/,
  /adnxs\.com/,
  /adsrvr\.org/,
  /advertising\.com/,
  /adtech\.de/,
  /ads\.yahoo\.com/,
  /amazon-adsystem\.com/,
  /media\.net/,
  /outbrain\.com/,
  /taboola\.com/,
  /rubiconproject\.com/,
  /openx\.net/,
  /pubmatic\.com/,
  /33across\.com/,
  /criteo\.com/,
  /casalemedia\.com/,
]

const TRACKER_PATTERNS: RegExp[] = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /googletagservices\.com/,
  /analytics\.twitter\.com/,
  /connect\.facebook\.net/,
  /facebook\.com\/tr/,
  /scorecardresearch\.com/,
  /quantserve\.com/,
  /hotjar\.com/,
  /mixpanel\.com/,
  /segment\.com/,
  /amplitude\.com/,
  /heap\.io/,
  /clarity\.ms/,
  /newrelic\.com/,
  /nr-data\.net/,
  /fullstory\.com/,
  /logrocket\.com/,
]

export class BlocklistManager {
  private adPatterns: RegExp[] = []
  private trackerPatterns: RegExp[] = []
  private initialized = false

  async initialize(): Promise<void> {
    this.adPatterns = AD_PATTERNS
    this.trackerPatterns = TRACKER_PATTERNS
    this.initialized = true
    console.log('[BlocklistManager] Initialized with built-in blocklists')
  }

  shouldBlock(url: string, options: BlockOptions): boolean {
    if (!this.initialized) return false

    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname

      if (options.adBlock) {
        for (const pattern of this.adPatterns) {
          if (pattern.test(hostname) || pattern.test(url)) {
            return true
          }
        }
      }

      if (options.trackerBlock) {
        for (const pattern of this.trackerPatterns) {
          if (pattern.test(hostname) || pattern.test(url)) {
            return true
          }
        }
      }
    } catch {
      // 不正なURLはブロックしない
    }

    return false
  }

  getStats(): { adPatterns: number; trackerPatterns: number } {
    return {
      adPatterns: this.adPatterns.length,
      trackerPatterns: this.trackerPatterns.length,
    }
  }
}
