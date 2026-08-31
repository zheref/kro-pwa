/**
 * `Owner` — canon `KroCore/Model/Owner.swift`.
 *
 * A two-case Swift enum with associated values, ported as a discriminated
 * union (`RC-24`) whose members are exactly the encoded shape, so the codec is
 * close to the identity function.
 *
 * ## Canon divergence (deliberate — see the PR Notes)
 *
 * Swift's `encode(to:)` writes the **group** case as
 *
 * ```swift
 * case .group(let groupId):
 *     try container.encode(OwnerType.group, forKey: .groupId)   // <- .groupId
 *     try container.encode(groupId, forKey: .groupId)
 * ```
 *
 * so the discriminant lands under `groupId` (immediately overwritten by the
 * id) and the `type` key is never written at all. Swift's own `init(from:)`
 * requires `type`, so a group owner encoded by KroApple cannot be decoded by
 * KroApple. That is a defect, not a wire contract, and porting it would
 * produce JSON no reader can consume — so this port writes `type: "group"`
 * under the `type` key, which is what the decoder on both sides expects.
 */
import { assertNever } from '../../library/assertNever'

export type Owner =
  | { readonly type: 'user'; readonly userId: string }
  | { readonly type: 'group'; readonly groupId: string }

/** `.user(userId:)`. */
export const userOwner = (userId: string): Owner => ({ type: 'user', userId })

/** `.group(groupId:)`. */
export const groupOwner = (groupId: string): Owner => ({
  type: 'group',
  groupId,
})

/** The identifier an owner carries, whichever case it is. */
export const ownerIdentifier = (owner: Owner): string => {
  switch (owner.type) {
    case 'user':
      return owner.userId
    case 'group':
      return owner.groupId
    default:
      return assertNever(owner)
  }
}
