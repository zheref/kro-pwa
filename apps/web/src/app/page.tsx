import { redirect } from 'next/navigation'

/**
 * `/` — the app's front door.
 *
 * A passive Server Component (`RC-38`): it resolves nothing, reads no store,
 * calls no hook, and renders no markup. Its whole behaviour is sending the
 * visitor into the parity shell's landing destination.
 *
 * **Why My Day.** Product canon decides the landing destination, not this repo:
 * KroApple's `ElementsRepository` builds the navigation with
 * `.add(element: .init(type: .doTab, isInitial: true), …)`, and `MainFeature`
 * selects `first(where: \.isInitial)` on the first emission — the Do surface,
 * which this port calls My Day and serves at `/my-day`. The port already
 * agreed: `MainFeature`'s initial `selected` is `DestinationKind.myDay` and
 * `NavigationSections` flags that same row initial. This file is only the URL
 * saying the same thing.
 *
 * **Temporary, deliberately.** `redirect()` answers 307, not 308. The landing
 * destination is a product decision that can change, and the installed app's
 * `start_url` is this route (see `manifest.ts`) — a permanent redirect would be
 * cached by the browser past any such change, on exactly the surface that is
 * hardest to fix afterwards.
 *
 * This route used to be the create-next-app template page, parked in the
 * `(legacy)` group "until retired". KC-IS-#79 is that retirement: the group,
 * its Chakra provider tree and the vendored Chakra set are gone, and the three
 * addresses that hung off it (`/`, `/settings`, `/integrations`) are now three
 * passive redirects into the shell.
 */
export default function RootRoute() {
  redirect('/my-day')
}
