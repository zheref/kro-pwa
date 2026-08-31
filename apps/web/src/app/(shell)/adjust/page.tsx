import { AdjustPageClient } from './AdjustPageClient'

/**
 * `/adjust` — the Adjust destination (canon's Settings).
 *
 * A passive Server Component (`RC-38`): it renders the client wrapper and
 * nothing else. No hook, no store read, no markup. The surface itself lives in
 * `packages/app`, so KC-IS-#32 replaced a Page there and this file changed by
 * exactly one import — which is what the shell child (#13) wrote the route tree
 * for.
 *
 * The shell's own selection still follows the URL: `SettingsHubPage` dispatches
 * the destination-mounted event the shared `DestinationPage` used to, so a
 * pasted link and a back step land the same way they did before.
 */
export default function AdjustRoute() {
  return <AdjustPageClient />
}
