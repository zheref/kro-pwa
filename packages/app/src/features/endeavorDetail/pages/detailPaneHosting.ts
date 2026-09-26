/**
 * The one pane edge Endeavor Detail answers with an EFFECT — canon's
 * `paneEndeavorDetail` mount (#517).
 *
 * Everything else between Detail and the shell's trailing pane is reducer-tier
 * now: Detail opening points the pane's Plan at it (the shell's slice follows
 * Detail's events), the pane leaving Plan releases Detail (Detail's slice
 * follows the shell's), and Detail closing from inside hides a pane that was
 * showing it. What is left is *reopening*: Plan showing an endeavor with no
 * Detail mounted — the user reselected Plan, went Back to it, or a drill-in
 * pointed it — must load that endeavor from the store, which only a Producer
 * may read (`openDetailByIdThunk`). The segment control lives in the shell's
 * Page, so the overlay dispatches that Producer when this reading holds.
 *
 * Level-triggered on purpose: the reading only holds on the render after one
 * of those pane moves, and a miss (the endeavor was deleted) leaves it holding
 * without changing it, so the effect keyed on it cannot loop.
 */

/** One render's reading of the two slices. */
export interface DetailPaneHostingSnapshot {
  /** The shell hosts a pane at all (flag on, sidebar shell). */
  readonly isHost: boolean
  /** Whether Endeavor Detail is presenting something. */
  readonly isDetailOpen: boolean
  /** The pane's segment, or `null` when it is hidden. */
  readonly paneSegment: 'sessionSetup' | 'performance' | 'plan' | null
  /** The endeavor the pane is pointed at, if any. */
  readonly paneEndeavorId: string | null
}

/** The endeavor Detail should reopen on for the pane, or `null` for none. */
export function detailPaneReopenRequest(
  snapshot: DetailPaneHostingSnapshot,
): string | null {
  const { isHost, isDetailOpen, paneSegment, paneEndeavorId } = snapshot
  if (!isHost || isDetailOpen || paneSegment !== 'plan') return null
  return paneEndeavorId
}
