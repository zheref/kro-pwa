/**
 * The Delegate quadrant's Share, as the web can perform it.
 *
 * Canon presents `UIActivityViewController` **over** the still-mounted Triage
 * screen and pops the child when the sheet is dismissed *"(cancel or
 * completion)"* — the two outcomes are deliberately not distinguished. The web
 * equivalent is `navigator.share()`, which resolves on completion and rejects
 * with an `AbortError` on cancel; both end the session here, exactly as canon
 * ends it on either.
 *
 * ## Where this SHOULD live, and why it does not (a named divergence)
 *
 * `spec/architecture/web.md` § 4 is explicit that a one-shot platform
 * capability — *"sounds, notifications, wake lock and clipboard are Services,
 * not view code"* — belongs behind `ThunkExtra` and is invoked from a Producer
 * (`RC-3`, `RC-6`). No share Service is wired: `FindOperations.ts` names the
 * same gap in as many words (*"Web has `navigator.share`, but a platform
 * capability is a Service behind `ThunkExtra` (`RC-6`) and none is wired
 * yet"*). Wiring one means editing `packages/app/src/services/**` **and**
 * `packages/app/src/library/store.ts`, both outside KC-IS-#26's declared file
 * lane and the latter a serial, high-contention file with a sibling in flight.
 *
 * So this module is the **narrowest possible stand-in** and it is shaped to be
 * deleted:
 *   · the browser APIs are reached through an injected `TriageShareGateway`,
 *     defaulting to the real ones — the same substitution seam `ThunkExtra`
 *     gives a Producer, so the interaction test drives the fallback without a
 *     global stub;
 *   · it is not named `…Service.ts`, because it is not one — the boundary
 *     check would (correctly) refuse a component importing a real Service;
 *   · every outcome is a value, never a throw, which is `RC-7`'s contract in
 *     the shape a view can consume.
 *
 * Promoting it is a one-file move plus a `ThunkExtra` field, and the call site
 * becomes a `dispatch`. Reported as a cross-lane need with this PR.
 */

/** What actually happened, as the Page needs to know it. */
export const TriageShareOutcome = {
  /** The share sheet completed. */
  shared: 'shared',
  /** The user dismissed the share sheet. Canon treats this as completion. */
  dismissed: 'dismissed',
  /** No share sheet; the blurb went to the clipboard instead. */
  copied: 'copied',
  /** Neither capability exists, or both failed. Nothing left the app. */
  unavailable: 'unavailable',
} as const

export type TriageShareOutcome =
  (typeof TriageShareOutcome)[keyof typeof TriageShareOutcome]

/**
 * The two browser capabilities this needs, as one injectable surface.
 *
 * Both are optional because both genuinely are: `navigator.share` is absent on
 * every desktop Firefox and on any non-secure origin, and `navigator.clipboard`
 * is absent on a non-secure origin too.
 */
export interface TriageShareGateway {
  readonly share?: (data: { readonly text: string }) => Promise<void>
  readonly writeText?: (text: string) => Promise<void>
}

/**
 * The live gateway — the browser's own APIs, bound at call time.
 *
 * Bound rather than referenced: `navigator.share` throws `Illegal invocation`
 * if it is called detached from `navigator`, which is the classic way a "share
 * is available" check passes and the share itself still fails.
 */
export const browserTriageShareGateway = (): TriageShareGateway => {
  if (typeof navigator === 'undefined') return {}
  const canShare = typeof navigator.share === 'function'
  const canWrite = typeof navigator.clipboard?.writeText === 'function'
  return {
    share: canShare
      ? (data) => navigator.share({ text: data.text })
      : undefined,
    writeText: canWrite
      ? (text) => navigator.clipboard.writeText(text)
      : undefined,
  }
}

/** Whether a rejection is the user closing the sheet rather than a failure. */
const isAbort = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error as { name?: unknown }).name === 'AbortError'

/**
 * Share `text`, falling back to the clipboard.
 *
 * The order is canon's intent — the system sheet is the affordance the user
 * expects — and the fallback is the web's own: with no share sheet, putting the
 * blurb where the user can paste it is the closest thing to handing it off.
 *
 * A share that **fails** (not one the user cancelled) still falls back, because
 * a failed hand-off with nothing on the clipboard leaves the user with neither.
 * A cancel does not: the user said no, and silently copying would be a second
 * action they did not ask for.
 */
export const performTriageShare = async (
  text: string,
  gateway: TriageShareGateway = browserTriageShareGateway(),
): Promise<TriageShareOutcome> => {
  if (gateway.share !== undefined) {
    try {
      await gateway.share({ text })
      return TriageShareOutcome.shared
    } catch (error) {
      if (isAbort(error)) return TriageShareOutcome.dismissed
      // fall through to the clipboard
    }
  }

  if (gateway.writeText !== undefined) {
    try {
      await gateway.writeText(text)
      return TriageShareOutcome.copied
    } catch {
      return TriageShareOutcome.unavailable
    }
  }

  return TriageShareOutcome.unavailable
}

/** The status line the surface shows once the hand-off resolved. */
export const triageShareNotice = (
  outcome: TriageShareOutcome,
): string | null => {
  switch (outcome) {
    case TriageShareOutcome.shared:
    case TriageShareOutcome.dismissed:
      return null
    case TriageShareOutcome.copied:
      return 'Sharing is unavailable here, so the message was copied to your clipboard.'
    case TriageShareOutcome.unavailable:
      return 'Sharing is unavailable here, and the message could not be copied.'
    default:
      return null
  }
}
