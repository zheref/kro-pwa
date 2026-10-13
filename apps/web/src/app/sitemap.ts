import type { MetadataRoute } from 'next'
import { siteUrl } from '../hostRouting'

/**
 * The sitemap lists the marketing pages — the landing and pricing — and
 * nothing else: the app lives on the hub host, which is `noindex` (see
 * `hostRouting.ts`), so no app address belongs in a search index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl()}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl()}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
