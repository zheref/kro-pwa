/**
 * `EarlyAccessRequest` — a visitor asking to be told when Kro reaches their
 * platform. The domain side of the landing page's early-access form.
 *
 * `source` is where the request came from on the page (e.g. `hero`,
 * `platforms`), and `locale` the browser's language tag — both optional
 * context for the waitlist, never identity. The email is the only personal
 * datum and it is never logged anywhere on its way to the sink.
 */
import type { KroPlatform } from './KroPlatform'

export interface EarlyAccessRequest {
  readonly email: string
  readonly platform: KroPlatform
  readonly source: string | null
  readonly locale: string | null
}
