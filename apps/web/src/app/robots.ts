import type { MetadataRoute } from 'next'
import { siteUrl } from '../hostRouting'

/**
 * Crawl the landing; keep crawlers out of the API and the `/hub` bridge.
 *
 * The app's own addresses are deliberately NOT disallowed. On the apex they
 * only 307 to the hub, and the hub answers `X-Robots-Tag: noindex, nofollow`
 * on every response it serves. A robots disallow would stop a crawler from
 * ever fetching those pages — and so from ever reading that header — leaving
 * a hub URL linked from elsewhere listable as "indexed, though blocked".
 * `robots.txt` bypasses the host routing, so every host serves this one file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/hub'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
