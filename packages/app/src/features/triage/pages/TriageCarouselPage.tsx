'use client'

/**
 * Triage's stateful container (`RC-37`) — canon's `TriageScreen`, plus the four
 * Triage arms `MainFeature` carries on the other side of the delegate.
 *
 * It is the only artifact on this surface that calls both `useAppSelector` and
 * `useAppDispatch`, it owns no markup beyond the single Fragment call, and it
 * is the one artifact allowed to dispatch across slices — which is the whole
 * reason it exists here rather than inside the Inbox: Triage's session lives in
 * the `triage` slice, its trigger lives in the `capture` slice, its Start Now
 * lands in the `session` slice, and no slice may import a sibling (`RC-20`).
 *
 * ## The hand-off from the Inbox is a one-shot, both ways
 *
 * KC-IS-#24's Inbox raises `userDidTapTriage`, which parks a
 * `CaptureTriageRequest` carrying canon's parent-computed seed
 * (`nextFreeSlotToday`, taken at the moment of the tap because the gap depends
 * on today's events as they stand right then). This Page drains it: it resolves
 * the dark-launched Edit flag, opens the session, and acknowledges with
 * `onTriageRequestConsumed` so a second tap is a second request rather than one
 * swallowing the other. The symmetric drain runs on the way out —
 * `selectTriageOutcome` parks what the shell must perform and
 * `onTriageOutcomeConsumed` spends it (`RC-17`).
 *
 * ## What each outcome actually does
 *
 * | outcome | here |
 * |---|---|
 * | `dismissed` | nothing — the Shifter already dropped the session |
 * | `completed` | the durable save, then the Inbox pool reloads and the row drains |
 * | `startNow` | the same save, then the focus session is prepared for that endeavor |
 * | `shared` | the same save, then the Web Share hand-off; the sheet's dismissal ends the session |
 * | `archived` | the same save — Archive is a status change and the decision carries it |
 * | `editRequested` | the `edit` intent the global Detail overlay drains |
 *
 * The save is `saveTriageDecisionThunk`, unchanged: local store first (*"the
 * durability guarantee"*), then the remote push, and a push that did not land
 * never undoes the write. Nothing here re-implements a step of it.
 *
 * **Why the pool reload is dispatched from this Page.** Canon's `MainFeature`
 * owns the endeavor pool and applies the decision to it in memory. There is no
 * Main slice on this stack — the pool is read per surface — so the Inbox's copy
 * has to be re-read for the triaged row to leave *Pending Triage*. That is one
 * `loadCaptureContextThunk`, the same Producer the Inbox already mounts with,
 * and it is what makes *"confirming returns to the inbox with the row drained"*
 * true rather than a claim.
 *
 * ## Start Now stops at "prepared", and that is deliberate
 *
 * `prepareSessionLaunchThunk` is #21's shipped ready-phase setup and it is what
 * canon's *"deploys the focus-session sheet for the endeavor"* resolves to on
 * this stack. The **sheet** that renders a prepared session is KC-IS-#22's, in
 * flight in a parallel lane; this Page must not touch it (`features/session` is
 * that child's exclusive lane) and does not. So the hand-off is complete and
 * asserted in state; the surface that draws it arrives with #22.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { computedSymbol } from '../../../design/endeavor/endeavorCardModel'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { onTriageRequestConsumed } from '../../capture/CaptureFeature'
import { loadCaptureContextThunk } from '../../capture/CaptureProducer'
import {
  selectCaptureTriageRequest,
  selectJustCreatedEndeavor,
  selectPendingTriageEndeavors,
} from '../../capture/CaptureSelectors'
import { FindSurface } from '../../find/FindOperations'
import { performEndeavorOperationThunk } from '../../find/FindProducer'
import { prepareSessionLaunchThunk } from '../../session/SessionProducer'
import {
  onShareSheetDismissed,
  onTriageOutcomeConsumed,
  userDidSelectDueDate,
  userDidSelectDuration,
  userDidSelectExpiry,
  userDidSelectQuadrant,
  userDidStepRewardPoints,
  userDidTapArchive,
  userDidTapCancel,
  userDidTapConfirm,
  userDidTapEdit,
  userDidTapEffortRating,
  userDidTapExpiryPreset,
  userDidTapShare,
  userDidTapStartNow,
  userDidTapValueRating,
} from '../TriageFeature'
import { openTriageThunk, saveTriageDecisionThunk } from '../TriageProducer'
import {
  selectCanClearTriageExpiry,
  selectCanConfirmTriage,
  selectIsTriageEditReachable,
  selectIsTriageExpiryCustom,
  selectIsTriageSaving,
  selectTriageBlockedReason,
  selectTriageDueDate,
  selectTriageDurationChips,
  selectTriageEffortRating,
  selectTriageExpiry,
  selectTriageExpiryScrollNonce,
  selectTriageExpiryTokens,
  selectTriageHeading,
  selectTriagePrimaryActionLabel,
  selectTriagePushNotice,
  selectTriageQuadrantTiles,
  selectTriageRewardPoints,
  selectTriageSaveException,
  selectTriageSecondaryAction,
  selectTriageSelectedExpiryToken,
  selectTriageSession,
  selectTriageValueRating,
} from '../TriageSelectors'
import { TRIAGE_DEFAULT_SYMBOL } from '../TriageState'
import { TriageCarouselFragment } from './TriageCarouselFragment'
import { TriageFormFragment } from './TriageFormFragment'
import { resolveTriageEditReachabilityThunk } from './TriageCapabilitiesProducer'
import { performTriageShare, triageShareNotice } from './triageShare'
import type { TriageShareGateway } from './triageShare'

export interface TriageCarouselPageProps {
  /**
   * The share gateway. Production leaves it undefined and the browser's own
   * APIs are used; a story or a test injects a double.
   *
   * A prop rather than `ThunkExtra` for the reason `triageShare.ts` gives at
   * length: the share Service this belongs in is not wired, and wiring it means
   * editing two files outside this issue's lane. Reported as a cross-lane need.
   */
  readonly shareGateway?: TriageShareGateway
  /** Stories and tests pin the carousel's width; production measures it. */
  readonly carouselWidth?: number
  readonly locale?: string
}

export function TriageCarouselPage({
  shareGateway,
  carouselWidth,
  locale,
}: TriageCarouselPageProps) {
  const dispatch = useAppDispatch()

  const request = useAppSelector(selectCaptureTriageRequest)
  const pendingTriage = useAppSelector(selectPendingTriageEndeavors)
  const justCreated = useAppSelector(selectJustCreatedEndeavor)

  const session = useAppSelector(selectTriageSession)
  const heading = useAppSelector(selectTriageHeading)
  const rewardPoints = useAppSelector(selectTriageRewardPoints)
  const durationChips = useAppSelector(selectTriageDurationChips)
  const quadrantTiles = useAppSelector(selectTriageQuadrantTiles)
  const value = useAppSelector(selectTriageValueRating)
  const effort = useAppSelector(selectTriageEffortRating)
  const dueDate = useAppSelector(selectTriageDueDate)
  const expiry = useAppSelector(selectTriageExpiry)
  const expiryTokens = useAppSelector(selectTriageExpiryTokens)
  const selectedExpiryToken = useAppSelector(selectTriageSelectedExpiryToken)
  const isExpiryCustom = useAppSelector(selectIsTriageExpiryCustom)
  const canClearExpiry = useAppSelector(selectCanClearTriageExpiry)
  const expiryScrollNonce = useAppSelector(selectTriageExpiryScrollNonce)
  const canConfirm = useAppSelector(selectCanConfirmTriage)
  const blockedReason = useAppSelector(selectTriageBlockedReason)
  const primaryActionLabel = useAppSelector(selectTriagePrimaryActionLabel)
  const secondaryAction = useAppSelector(selectTriageSecondaryAction)
  const isEditReachable = useAppSelector(selectIsTriageEditReachable)
  const isSaving = useAppSelector(selectIsTriageSaving)
  const saveException = useAppSelector(selectTriageSaveException)
  const pushNotice = useAppSelector(selectTriagePushNotice)
  // An O(1) field read, which is all `RC-5` allows in a callback — and all the
  // outcome drain needs. It is deliberately not a Selector chain: the one-shot
  // has to be read as an identity so the effect below fires once per raise.
  const outcome = useAppSelector((state) => state.triage.outcome)

  /**
   * What the Web Share hand-off did, when it did not simply work.
   *
   * The **only** `useState` in this Page, and it is here because the fact it
   * holds is not modelled anywhere else: a share that fell back to the
   * clipboard is the outcome of a browser capability, and the capability is not
   * a Service yet (see `triageShare.ts`). When that Service is wired the
   * outcome rides back through the Producer into `TriageState` alongside the
   * push outcome, `selectTriagePushNotice` gains a sibling, and this deletes.
   *
   * It is not feature state in `RC-4`'s sense in the meantime: no rule reads
   * it, it survives no reload, and it is cleared by the next session opening.
   */
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  /**
   * The request already being opened.
   *
   * `openTriageThunk` is async and the effect below re-runs whenever the pool
   * changes, so without this a second render between the dispatch and the
   * acknowledgement would open the same row twice. A ref, not state: it is one
   * hand-off's bookkeeping and painting it would be a wasted render.
   */
  const openingFor = useRef<string | null>(null)

  /**
   * Every effect this Page has in flight, aborted on **unmount and only on
   * unmount** (`UZF-14`: cancellation is the one silent exit).
   *
   * It is a ref rather than an effect-local handle for a reason that cost a
   * round to find: the open hand-off *ends* by dispatching
   * `onTriageRequestConsumed`, which clears `request`, which re-runs the very
   * effect that started it. An effect-local `return () => open.abort()` would
   * therefore abort the open it had just dispatched, and
   * `openTriageThunk.rejected`'s `action.meta.aborted` guard would return early
   * — leaving the screen silently unopened. The lifetime that matters here is
   * the Page's, not one effect run's.
   */
  const inFlight = useRef<{ abort: () => void }[]>([])
  useEffect(
    () => () => {
      for (const effect of inFlight.current) effect.abort()
      inFlight.current = []
    },
    [],
  )

  /**
   * Hold an effect's abort handle for as long as the effect is actually
   * running, and not one moment longer.
   *
   * The register is the Page's, so a settled handle has to be dropped as it
   * settles — otherwise an Inbox session that triages twenty rows unmounts by
   * aborting forty resolved promises and holding forty references it will never
   * use. `finally` rather than `then`: a handle is spent whichever way its
   * effect ended, cancellation included.
   */
  const track = useCallback(
    <T extends { abort: () => void } & PromiseLike<unknown>>(effect: T): T => {
      inFlight.current.push(effect)
      void Promise.resolve(effect).finally(() => {
        inFlight.current = inFlight.current.filter((held) => held !== effect)
      })
      return effect
    },
    [],
  )

  // --- opening ----------------------------------------------------------

  useEffect(() => {
    if (request === null) return
    if (openingFor.current === request.endeavorId) return
    openingFor.current = request.endeavorId

    const known =
      pendingTriage.find((endeavor) => endeavor.id === request.endeavorId) ??
      (justCreated?.id === request.endeavorId ? justCreated : undefined)

    // Canon's Inbox hands Triage the row's own symbol; the card model is where
    // this repo answers "which emoji is this endeavor", so the two surfaces
    // cannot disagree about the glyph in the header.
    const endeavorSymbol =
      known === undefined
        ? TRIAGE_DEFAULT_SYMBOL
        : computedSymbol(known.title)

    const flag = track(dispatch(resolveTriageEditReachabilityThunk()))

    void flag.then((action) => {
      const result = resolveTriageEditReachabilityThunk.fulfilled.match(action)
        ? action.payload
        : null
      track(
        dispatch(
          openTriageThunk({
            endeavorId: request.endeavorId,
            now: new Date(),
            nextFreeSlotToday: request.nextFreeSlotToday,
            endeavorSymbol,
            isEditReachable: result !== null && result.ok ? result.value : false,
          }),
        ),
      )
      setShareNotice(null)
      // The one-shot is spent the moment Triage has been asked to present.
      dispatch(onTriageRequestConsumed())
    })
  }, [dispatch, track, request, pendingTriage, justCreated])

  // The next request may be for the same row, so the latch releases as soon as
  // the Inbox has taken its one-shot back.
  useEffect(() => {
    if (request === null) openingFor.current = null
  }, [request])

  // --- draining the outcome ---------------------------------------------

  useEffect(() => {
    if (outcome === null) return
    const now = new Date()

    const save = async (decision: Parameters<typeof saveTriageDecisionThunk>[0]['decision']) => {
      const action = await dispatch(saveTriageDecisionThunk({ decision, now }))
      const result = saveTriageDecisionThunk.fulfilled.match(action)
        ? action.payload
        : null
      // The Inbox's pool is a per-surface read, so the triaged row leaves
      // Pending Triage only once it has been re-read. A failed save leaves the
      // pool alone: the row is still untriaged and must stay on the list.
      //
      // The reload classifies against **the same `now` the decision was saved
      // with**, never a second clock reading: the rows the Inbox is about to
      // re-draw are the rows this decision just changed, and two instants would
      // let a row's urgency disagree with the write that produced it. It is the
      // same rule `InboxOverlayPage` states about its Undo deadline.
      if (result !== null && result.ok) {
        void dispatch(loadCaptureContextThunk({ now }))
      }
      return result !== null && result.ok
    }

    switch (outcome.kind) {
      case 'dismissed':
        break
      case 'completed':
      case 'archived':
        void save(outcome.decision)
        break
      case 'startNow':
        void save(outcome.decision).then((saved) => {
          if (!saved) return
          void dispatch(
            prepareSessionLaunchThunk({
              endeavorId: outcome.decision.endeavorId,
              // The launch mints its own id; a blank session would take this
              // one, and an endeavor-backed session carries it as the
              // fragment's identity.
              sessionId: `triage-${outcome.decision.endeavorId}-${now.getTime()}`,
            }),
          )
        })
        break
      case 'shared':
        void save(outcome.decision).then(async (saved) => {
          // Gated on the save exactly as Start Now is, and for a reason
          // specific to this arm: Delegate is the one outcome that keeps the
          // screen mounted, so its hand-off ends by *popping* it
          // (`onShareSheetDismissed`). Running that after a **local** save
          // failure would throw the form away in the one case the decision was
          // genuinely lost — the case `withSaveFailed` exists to leave alone,
          // because "a user who has to retry should not also have to re-enter
          // it". Handing the row to somebody else on the strength of a write
          // that did not land is the second half of the same mistake.
          if (!saved) return
          const shareOutcome = await performTriageShare(
            outcome.text,
            shareGateway,
          )
          setShareNotice(triageShareNotice(shareOutcome))
          // Canon pops the Triage child when the share sheet is dismissed —
          // *"cancel or completion"* — never on the Share tap itself.
          dispatch(onShareSheetDismissed())
        })
        break
      case 'editRequested':
        // The `edit` intent the global Detail overlay drains (KC-IS-#30). It
        // parks a request; it performs no write, so no triage decision is
        // applied — canon's *"No triage decision is applied"*.
        void dispatch(
          performEndeavorOperationThunk({
            surface: FindSurface.find,
            operation: 'edit',
            endeavorId: outcome.endeavorId,
            now,
          }),
        )
        break
      default:
        break
    }

    dispatch(onTriageOutcomeConsumed())
  }, [dispatch, outcome, shareGateway])

  // --- intents ----------------------------------------------------------

  const onTapCancel = useCallback(() => {
    dispatch(userDidTapCancel())
  }, [dispatch])

  const onSelectQuadrant = useCallback(
    (quadrant: Parameters<typeof userDidSelectQuadrant>[0]['quadrant']) => {
      // `now` is read at the moment of the tap: the Urgent column's seed is the
      // soonest gap in *today as it stands right then*, which a render-time
      // instant could not give.
      dispatch(userDidSelectQuadrant({ quadrant, now: new Date() }))
    },
    [dispatch],
  )

  const onSelectDuration = useCallback(
    (minutes: number) => {
      dispatch(userDidSelectDuration({ minutes }))
    },
    [dispatch],
  )

  const onSelectDueDate = useCallback(
    (date: Date | null) => {
      dispatch(userDidSelectDueDate({ date }))
    },
    [dispatch],
  )

  const onSelectExpiry = useCallback(
    (date: Date | null) => {
      dispatch(userDidSelectExpiry({ date }))
    },
    [dispatch],
  )

  const onTapExpiryPreset = useCallback(
    (preset: Parameters<typeof userDidTapExpiryPreset>[0]['preset']) => {
      dispatch(userDidTapExpiryPreset({ preset }))
    },
    [dispatch],
  )

  const onStepReward = useCallback(
    (direction: Parameters<typeof userDidStepRewardPoints>[0]['direction']) => {
      dispatch(userDidStepRewardPoints({ direction }))
    },
    [dispatch],
  )

  const onTapValueRating = useCallback(
    (rating: number) => {
      dispatch(userDidTapValueRating({ rating }))
    },
    [dispatch],
  )

  const onTapEffortRating = useCallback(
    (rating: number) => {
      dispatch(userDidTapEffortRating({ rating }))
    },
    [dispatch],
  )

  const notice = shareNotice ?? pushNotice

  return (
    <TriageCarouselFragment
      isPresenting={session !== null}
      onDismiss={onTapCancel}
      isSaving={isSaving}
      saveExceptionMessage={
        saveException === null ? null : saveException.message
      }
      notice={notice}
      carouselWidth={carouselWidth}
    >
      {session === null || heading === null || rewardPoints === null ? null : (
        <TriageFormFragment
          endeavorTitle={heading.title}
          endeavorSymbol={heading.symbol}
          rewardPoints={rewardPoints}
          durationChips={durationChips}
          quadrantTiles={quadrantTiles}
          value={value ?? { rating: null, label: null }}
          effort={effort ?? { rating: null, label: null }}
          dueDate={dueDate}
          expiry={expiry}
          expiryTokens={expiryTokens}
          selectedExpiryToken={selectedExpiryToken}
          isExpiryCustom={isExpiryCustom}
          canClearExpiry={canClearExpiry}
          expiryScrollNonce={expiryScrollNonce}
          canConfirm={canConfirm}
          blockedReason={blockedReason}
          primaryActionLabel={primaryActionLabel}
          secondaryAction={secondaryAction}
          isEditReachable={isEditReachable}
          isSaving={isSaving}
          saveExceptionMessage={
            saveException === null ? null : saveException.message
          }
          notice={notice}
          locale={locale}
          onTapCancel={onTapCancel}
          onSelectQuadrant={onSelectQuadrant}
          onSelectDuration={onSelectDuration}
          onSelectDueDate={onSelectDueDate}
          onSelectExpiry={onSelectExpiry}
          onTapExpiryPreset={onTapExpiryPreset}
          onStepReward={onStepReward}
          onTapValueRating={onTapValueRating}
          onTapEffortRating={onTapEffortRating}
          onTapConfirm={() => dispatch(userDidTapConfirm())}
          onTapStartNow={() => dispatch(userDidTapStartNow())}
          onTapShare={() => dispatch(userDidTapShare())}
          onTapArchive={() => dispatch(userDidTapArchive())}
          onTapEdit={() => dispatch(userDidTapEdit())}
        />
      )}
    </TriageCarouselFragment>
  )
}
