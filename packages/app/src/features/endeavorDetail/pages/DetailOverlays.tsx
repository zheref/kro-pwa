'use client'

/**
 * The global Endeavor Detail overlay (`RC-37`) — canon's `EndeavorDetailScreen`
 * and the five children it presents, mounted **once** for the whole app.
 *
 * ## Why it is global, and why that is one line in the shell
 *
 * Canon presents Detail from wherever the user was: a Find row, a Plan block, a
 * Do card. Mounting it per surface would be one copy per surface, each with its
 * own dismissal and its own dirty state, and the fifth copy is the one that
 * disagrees. So it is mounted beside the shell's content and listens for the
 * `viewDetail` / `edit` intents `#29` parks — which is what makes "long-press
 * or secondary-click opens Detail from any endeavor row" a property of the
 * intent queue rather than of any one surface.
 *
 * The overlay drains only the two intents it owns, and acknowledges each by id
 * (`childIntentDelegatedConsumed`), so two taps on two rows are two requests
 * rather than one that swallows the other.
 *
 * ## Presentation follows the shell's own decision table
 *
 * `selectShellShape` is the ported `DoSurfaceLayout` answer, so the overlay
 * takes the epic's idiom rule without re-deriving it: a bottom **sheet** on the
 * tab-bar shell (the edge a thumb reaches) and a centred **dialog** on the
 * sidebar shell. Both are the same Radix primitive on the same KroGlass
 * material — the design system built them that way for exactly this pairing.
 *
 * ## The title bar owns dismiss and save
 *
 * Canon moved dismissal out of the scroll body and into the navigation toolbar,
 * and its own header says why: the previous Close button "sat at the bottom of
 * the scroll, reachable only after scrolling past every section". The leading
 * control is therefore *Close* on the read surface and *Back* on an editor, and
 * Save sits opposite — enabled by `selectIsSaveEnabled`, which is dirty AND
 * valid AND not already saving AND (on the Duration screen) a coherent profile.
 */
import {
  type Defer,
  type EndeavorField,
  type EndeavorHost,
  type EndeavorRelation,
  type Perform,
  type Shadow,
  assertNever,
} from '@kro/core'
import { useCallback, useEffect } from 'react'
import { CompactPresentationHeader } from '../../../design/endeavor/CompactPresentationHeader'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../../design/system/primitives/dialog'
import { Sheet, SheetContent, SheetTitle } from '../../../design/system/primitives/sheet'
import { colorVar } from '../../../design/system/tokens/roles'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { childIntentDelegatedConsumed } from '../../find/FindFeature'
import { selectShellShape } from '../../main/MainSelectors'
import { selectProjects } from '../../main/MainSelectors'
import {
  onDetailRequested,
  onEditRequested,
  userDidAdjustDurationBound,
  userDidChangeField,
  userDidChangeRelationDraft,
  userDidDismissDestination,
  userDidTapDismiss,
  userDidTapField,
  userDidTapManageRelation,
  userDidToggleDurationBound,
} from '../EndeavorDetailFeature'
import {
  addDeferThunk,
  addPerformanceThunk,
  addShadowThunk,
  attachHostThunk,
  detachHostThunk,
  removeDeferThunk,
  removePerformanceThunk,
  removeShadowThunk,
  saveEndeavorThunk,
} from '../EndeavorDetailProducer'
import {
  selectDetailAttachedHosts,
  selectDetailBadges,
  selectDetailEndeavor,
  selectDetailException,
  selectDetailHostCandidates,
  selectDetailRelationCards,
  selectDetailTitle,
  selectDetailVisibleSections,
  selectDurationDraft,
  selectDetailDestination,
  selectEditWorkingCopy,
  selectEditableSections,
  selectEditNavigationTitle,
  selectIsDetailSaving,
  selectIsEditValid,
  selectIsRelationDraftCommittable,
  selectIsSaveEnabled,
  selectManagedRelation,
  selectObservedFocusTime,
  selectRelationDraft,
  selectRelationEmptyState,
  selectRelationReadOnlyReason,
  selectDurationValidationMessage,
} from '../EndeavorDetailSelectors'
import type { EndeavorDetailBadge } from '../EndeavorDetailCards'
import type { DurationBound } from '../EndeavorDuration'
import { EndeavorDetailFragment } from './EndeavorDetailFragment'
import { EndeavorDurationFragment } from './EndeavorDurationFragment'
import { EndeavorEditFragment } from './EndeavorEditFragment'
import {
  EndeavorRelationFragment,
  relationEntryFromDraft,
} from './EndeavorRelationFragment'
import { selectDetailIntentRequest } from './DetailOverlaySelectors'
import { relationLabel } from './endeavorDetailDisplay'

export interface DetailOverlaysProps {
  readonly locale?: string
}

export function DetailOverlays({ locale }: DetailOverlaysProps) {
  const dispatch = useAppDispatch()

  const request = useAppSelector(selectDetailIntentRequest)
  const endeavor = useAppSelector(selectDetailEndeavor)
  const destination = useAppSelector(selectDetailDestination)
  const title = useAppSelector(selectDetailTitle)
  const sections = useAppSelector(selectDetailVisibleSections)
  const relations = useAppSelector(selectDetailRelationCards)
  const editSections = useAppSelector(selectEditableSections)
  const working = useAppSelector(selectEditWorkingCopy)
  const editTitle = useAppSelector(selectEditNavigationTitle)
  const isValid = useAppSelector(selectIsEditValid)
  const isSaving = useAppSelector(selectIsDetailSaving)
  const isSaveEnabled = useAppSelector(selectIsSaveEnabled)
  const exception = useAppSelector(selectDetailException)
  const durationDraft = useAppSelector(selectDurationDraft)
  const observed = useAppSelector(selectObservedFocusTime)
  const validationMessage = useAppSelector(selectDurationValidationMessage)
  const managedRelation = useAppSelector(selectManagedRelation)
  const relationDraft = useAppSelector(selectRelationDraft)
  const isDraftCommittable = useAppSelector(selectIsRelationDraftCommittable)
  const readOnlyReason = useAppSelector(selectRelationReadOnlyReason)
  const relationEmptyState = useAppSelector(selectRelationEmptyState)
  const attachedHosts = useAppSelector(selectDetailAttachedHosts)
  const hostCandidates = useAppSelector(selectDetailHostCandidates)
  const badges = useAppSelector(selectDetailBadges)
  const projects = useAppSelector(selectProjects)
  const shape = useAppSelector(selectShellShape)

  /**
   * Drain the intents this overlay owns.
   *
   * `viewDetail` presents the read surface; `edit` opens the full editor
   * directly, which is canon's own two entry points. Both acknowledge by id
   * immediately after, so a remount cannot replay the same request.
   */
  useEffect(() => {
    if (request === null) return
    if (request.operation === 'edit') {
      dispatch(onEditRequested({ endeavor: request.endeavor }))
    } else {
      dispatch(onDetailRequested({ endeavor: request.endeavor }))
    }
    dispatch(childIntentDelegatedConsumed({ intentId: request.intentId }))
  }, [dispatch, request])

  const onSave = useCallback(() => {
    if (working === null) return
    void dispatch(saveEndeavorThunk({ endeavor: working, now: new Date() }))
  }, [dispatch, working])

  /**
   * Commit the open add form.
   *
   * `hosts` is deliberately absent: that screen has no form at all — a provider
   * is attached by its own row control, so the commit path never sees one. A
   * branch for it would be code no interaction can reach.
   */
  const onCommitDraft = useCallback(() => {
    if (endeavor === null || relationDraft === null) return
    if (relationDraft.relation === 'hosts') return
    const now = new Date()

    const entry = relationEntryFromDraft(relationDraft, now)
    if (entry === null) return

    switch (relationDraft.relation) {
      case 'performances':
        void dispatch(
          addPerformanceThunk({
            endeavorId: endeavor.id,
            performance: entry as Perform,
            now,
          }),
        )
        return
      case 'defers':
        void dispatch(
          addDeferThunk({ endeavorId: endeavor.id, entry: entry as Defer, now }),
        )
        return
      default:
        void dispatch(
          addShadowThunk({
            endeavorId: endeavor.id,
            shadow: entry as Shadow,
            now,
          }),
        )
    }
  }, [dispatch, endeavor, relationDraft])

  const onRemoveEntry = useCallback(
    (index: number) => {
      if (endeavor === null || managedRelation === null) return
      const now = new Date()
      const endeavorId = endeavor.id
      switch (managedRelation) {
        case 'performances':
          void dispatch(removePerformanceThunk({ endeavorId, index, now }))
          return
        case 'defers':
          void dispatch(removeDeferThunk({ endeavorId, index, now }))
          return
        case 'shadows':
          void dispatch(removeShadowThunk({ endeavorId, index, now }))
          return
        default:
          // `hosts` removes by provider, not by position — see `onDetachHost`.
          return
      }
    },
    [dispatch, endeavor, managedRelation],
  )

  const onDetachHost = useCallback(
    (host: EndeavorHost) => {
      if (endeavor === null) return
      void dispatch(detachHostThunk({ endeavorId: endeavor.id, host }))
    },
    [dispatch, endeavor],
  )

  const onAttachHost = useCallback(
    (host: EndeavorHost) => {
      if (endeavor === null) return
      void dispatch(attachHostThunk({ endeavorId: endeavor.id, host }))
    },
    [dispatch, endeavor],
  )

  if (endeavor === null) return null

  const isEditor = destination !== null
  const headerTitle =
    destination === null
      ? title
      : destination.kind === 'edit'
        ? editTitle
        : destination.kind === 'duration'
          ? 'Duration'
          : relationLabel(destination.relation)

  const showsSave =
    destination !== null &&
    (destination.kind === 'edit' || destination.kind === 'duration')

  const body =
    destination === null ? (
      <EndeavorDetailFragment
        endeavor={endeavor}
        title={title}
        sections={sections}
        relations={relations}
        locale={locale}
        onEditField={(field: EndeavorField) => dispatch(userDidTapField({ field }))}
        onManageRelation={(relation: EndeavorRelation) =>
          dispatch(userDidTapManageRelation({ relation }))
        }
      />
    ) : destination.kind === 'edit' && working !== null ? (
      <EndeavorEditFragment
        working={working}
        sections={editSections}
        isValid={isValid}
        isSaving={isSaving}
        exception={exception}
        projects={projects}
        onChangeField={(change) => dispatch(userDidChangeField({ change }))}
        onOpenDuration={() =>
          dispatch(userDidTapField({ field: 'duration' as EndeavorField }))
        }
      />
    ) : destination.kind === 'duration' && durationDraft !== null && observed !== null ? (
      <EndeavorDurationFragment
        draft={durationDraft}
        observed={observed}
        validationMessage={validationMessage}
        isSaving={isSaving}
        onToggleBound={(bound: DurationBound, isEnabled: boolean) =>
          dispatch(userDidToggleDurationBound({ bound, isEnabled }))
        }
        onAdjustBound={(bound: DurationBound, seconds: number) =>
          dispatch(userDidAdjustDurationBound({ bound, seconds }))
        }
      />
    ) : destination.kind === 'relation' && relationEmptyState !== null ? (
      <EndeavorRelationFragment
        relation={destination.relation}
        endeavor={endeavor}
        readOnlyReason={readOnlyReason}
        emptyState={relationEmptyState}
        isSaving={isSaving}
        exception={exception}
        draft={relationDraft}
        isDraftCommittable={isDraftCommittable}
        attachedHosts={attachedHosts}
        hostCandidates={hostCandidates}
        now={new Date()}
        locale={locale}
        onChangeDraft={(draft) => dispatch(userDidChangeRelationDraft({ draft }))}
        onCommitDraft={onCommitDraft}
        onRemoveEntry={onRemoveEntry}
        onAttachHost={onAttachHost}
        onDetachHost={onDetachHost}
      />
    ) : null

  const chrome = (
    <>
      <div className="flex items-center gap-kro-small">
        <div className="min-w-0 flex-1">
          <CompactPresentationHeader
            title={headerTitle}
            subtitle={badges.map((badge) => badgeLabel(badge)).join(' · ')}
            leadingAction={
              isEditor
                ? {
                    kind: 'back',
                    onPress: () => dispatch(userDidDismissDestination()),
                  }
                : { kind: 'dismiss', onPress: () => dispatch(userDidTapDismiss()) }
            }
          />
        </div>
        {showsSave ? (
          <button
            type="button"
            disabled={!isSaveEnabled}
            onClick={onSave}
            className="shrink-0 rounded-kro-pill px-4 text-sm font-semibold outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
            style={{
              minHeight: 'var(--kro-size-min-touch-target)',
              backgroundColor: colorVar('accent'),
              color: colorVar('onAccent'),
            }}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        ) : null}
      </div>
      {body}
    </>
  )

  const onOpenChange = (open: boolean) => {
    if (!open) dispatch(userDidTapDismiss())
  }

  return shape === 'sidebar' ? (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        data-testid="detail-overlay"
        className="max-h-[85vh] max-w-[620px] grid-rows-[auto_1fr] overflow-hidden"
      >
        <DialogTitle className="sr-only">{headerTitle}</DialogTitle>
        {chrome}
      </DialogContent>
    </Dialog>
  ) : (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent hideClose data-testid="detail-overlay" side="bottom">
        <SheetTitle className="sr-only">{headerTitle}</SheetTitle>
        {chrome}
      </SheetContent>
    </Sheet>
  )
}

/**
 * The subtitle line under the overlay's title: the endeavor's kind and state,
 * labelled — canon's own header badges, which `#29` already derives.
 */
const badgeLabel = (badge: EndeavorDetailBadge): string => {
  switch (badge.kind) {
    case 'kind':
    case 'status':
      return badge.label
    case 'duration':
      return `${Math.round(badge.seconds / 60)} min`
    case 'rewardPoints':
      return `${badge.points} pts`
    case 'repeats':
      return 'Repeats'
    default:
      return assertNever(badge)
  }
}
