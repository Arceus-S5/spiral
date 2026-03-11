import { session } from 'electron'
import path from 'path'
import fs from 'fs'
import { Extension } from '../shared/types'

// ============================================================
// Extension Manager
// ============================================================
export class ExtensionManager {
  private extensions: Map<string, Extension> = new Map()

  async install(extensionPath: string): Promise<Extension | null> {
    try {
      const manifestPath = path.join(extensionPath, 'manifest.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

      const ext = await session.defaultSession.loadExtension(extensionPath, {
        allowFileAccess: true
      })

      const extension: Extension = {
        id: ext.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        icon: manifest.icons?.['48'],
        enabled: true,
        permissions: manifest.permissions || [],
        installPath: extensionPath
      }

      this.extensions.set(ext.id, extension)
      return extension
    } catch (e) {
      console.error('Extension install failed:', e)
      return null
    }
  }

  async uninstall(id: string) {
    try {
      await session.defaultSession.removeExtension(id)
      this.extensions.delete(id)
    } catch (e) {
      console.error('Extension uninstall failed:', e)
    }
  }

  toggle(id: string, enabled: boolean) {
    const ext = this.extensions.get(id)
    if (ext) ext.enabled = enabled
  }

  getAll(): Extension[] {
    return Array.from(this.extensions.values())
  }
}

// ============================================================
// Blocklist Manager - 広告・トラッカーブロック
// ============================================================
export class BlocklistManager {
  private adDomains: Set<string> = new Set()
  private trackerDomains: Set<string> = new Set()

  async initialize() {
    // 基本的なブロックリスト（実際はEasyListなどを使用）
    const basicAdDomains = [
      'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
      'adnxs.com', 'advertising.com', 'adsrvr.org', 'adtechus.com',
      'amazon-adsystem.com', 'ads.yahoo.com', 'adsystem.amazon.com',
      'media.net', 'taboola.com', 'outbrain.com', 'revcontent.com',
      'criteo.com', 'criteo.net', 'pubmatic.com', 'rubiconproject.com',
      'openx.net', 'appnexus.com', 'casalemedia.com', 'turn.com'
    ]

    const basicTrackerDomains = [
      'google-analytics.com', 'googletagmanager.com', 'hotjar.com',
      'mixpanel.com', 'segment.io', 'segment.com', 'amplitude.com',
      'intercom.io', 'intercom.com', 'fullstory.com', 'logrocket.com',
      'mouseflow.com', 'clarity.ms', 'heap.io', 'quantserve.com',
      'scorecardresearch.com', 'comscore.com', 'chartbeat.net',
      'chartbeat.com', 'parsely.com', 'newrelic.com', 'datadog-browser-agent.com'
    ]

    basicAdDomains.forEach(d => this.adDomains.add(d))
    basicTrackerDomains.forEach(d => this.trackerDomains.add(d))
  }

  shouldBlock(url: string, options: { adBlock: boolean; trackerBlock: boolean }): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname

      if (options.adBlock) {
        for (const adDomain of this.adDomains) {
          if (domain === adDomain || domain.endsWith('.' + adDomain)) return true
        }
      }

      if (options.trackerBlock) {
        for (const trackerDomain of this.trackerDomains) {
          if (domain === trackerDomain || domain.endsWith('.' + trackerDomain)) return true
        }
      }
    } catch {}

    return false
  }
}
