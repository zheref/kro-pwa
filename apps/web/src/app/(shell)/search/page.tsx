import { SearchPageClient } from './SearchPageClient'

/**
 * `/search` — the Search destination, and Find's home.
 *
 * A passive Server Component (`RC-38`): it renders the client wrapper and
 * nothing else. No hook, no store read, no markup. The surface itself lives in
 * `packages/app`; this file only names which one.
 *
 * The shell's `DestinationPage` placeholder is gone from this route: the Page
 * it mounted was the "not built yet" card, and `FindPage` now carries the
 * `onDestinationRouteMounted` dispatch that placeholder was there for — see its
 * own header.
 */
export default function SearchRoute() {
  return <SearchPageClient />
}
