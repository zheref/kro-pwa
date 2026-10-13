/**
 * `EarlyAccessReceipt` — proof a visitor is on the early-access list.
 *
 * `position` is the visitor's place in line when the sink reports one, and
 * `null` when it does not (a plain webhook sink has no queue to count).
 */
import type { KroPlatform } from './KroPlatform'

export interface EarlyAccessReceipt {
  readonly id: string
  readonly email: string
  readonly platform: KroPlatform
  readonly position: number | null
  readonly joinedAt: Date
}
