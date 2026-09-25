/**
 * How Endeavor Detail and the shell's trailing detail pane stay in step while
 * the pane hosts Detail — canon's `paneEndeavorDetail` mount, reached across
 * two slices.
 *
 * Canon holds Detail's state INSIDE `MainFeature` when the pane shows it, so
 * mounting and releasing are one Shifter. Here Detail is its own slice and the
 * pane is the shell's (`RC-20` keeps them apart), so the overlay Page — the
 * artifact allowed to see both — reconciles them. This is the decision half of
 * that reconciliation: a pure function of the previous and current readings,
 * so every edge is a unit test instead of an effect to reason about.
 *
 * The rule, in canon's words: *"exactly one content is mounted at a time"*.
 */

/** One render's reading of the two slices. */
export interface DetailPaneHostingSnapshot {
  /** The shell hosts a pane at all (flag on, sidebar shell). */
  readonly isHost: boolean
  /** Detail's presented endeavor, or `null` when Detail is closed. */
  readonly detail: { readonly id: string; readonly title: string } | null
  /** The pane's segment, or `null` when it is hidden. */
  readonly paneSegment: 'sessionSetup' | 'performance' | 'plan' | null
  /** The endeavor the pane is pointed at, if any. */
  readonly paneEndeavorId: string | null
}

export type DetailPaneHostingAction =
  /** Detail opened on a new endeavor — point the pane's Plan at it. */
  | {
      readonly kind: 'pointPane'
      readonly endeavor: { readonly id: string; readonly title: string }
    }
  /** The pane left Plan (or closed) — release Detail with it. */
  | { readonly kind: 'dismissDetail' }
  /** Detail closed from inside (a delete, say) — hide the pane showing it. */
  | { readonly kind: 'dismissPane' }
  /** Plan was reselected on a remembered endeavor — reopen its Detail. */
  | { readonly kind: 'reopenDetail'; readonly endeavorId: string }

export function detailPaneHostingAction(
  previous: DetailPaneHostingSnapshot,
  current: DetailPaneHostingSnapshot,
): DetailPaneHostingAction | null {
  if (!current.isHost) return null

  const { detail, paneSegment, paneEndeavorId } = current

  if (detail !== null) {
    if (previous.detail?.id !== detail.id) {
      return { kind: 'pointPane', endeavor: detail }
    }
    if (previous.paneSegment === 'plan' && paneSegment !== 'plan') {
      return { kind: 'dismissDetail' }
    }
    return null
  }

  if (
    previous.detail !== null &&
    paneSegment === 'plan' &&
    paneEndeavorId === previous.detail.id
  ) {
    return { kind: 'dismissPane' }
  }

  if (
    paneSegment === 'plan' &&
    previous.paneSegment !== 'plan' &&
    paneEndeavorId !== null
  ) {
    return { kind: 'reopenDetail', endeavorId: paneEndeavorId }
  }

  return null
}
