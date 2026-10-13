import type { MetadataRoute } from 'next'
import { siteUrl } from '../hostRouting'

/**
 * The sitemap lists the landing and nothing else: the app lives on the hub
 * host, which is `noindex` (see `hostRouting.ts`), so no app address belongs
 * in a search index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl()}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
