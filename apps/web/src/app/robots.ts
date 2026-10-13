import type { MetadataRoute } from 'next'
import { APP_PATHS, siteUrl } from '../hostRouting'

/**
 * Crawl the landing; stay out of the app. The app's addresses on the apex
 * only redirect to the hub (which answers `X-Robots-Tag: noindex`), so they
 * are disallowed here as well, along with the API and the `/hub` bridge.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...APP_PATHS, '/api/', '/hub'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
