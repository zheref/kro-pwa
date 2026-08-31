/**
 * Selectors run against a hand-built root state, never a live store (`RC-55`).
 * The other registered slices are filled from their own initial states only
 * because `RootState` names every one of them.
 */
import { EndeavorField, EndeavorHost, EndeavorRelation } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import type { RootState } from '../../../library/store'
import { initialPlanState } from '../../plan/PlanState'
import { initialTriageState } from '../../triage/TriageFeature'
import {
  detailEndeavorMocks,
  detailStateMocks,
} from '../EndeavorDetailMocks'
import {
  selectDetailAttachedHosts,
  selectDetailBadges,
  selectDetailDefers,
  selectDetailDestination,
  selectDetailEndeavor,
  selectDetailException,
  selectDetailFieldsBySection,
  selectDetailHostCandidates,
  selectDetailPerformances,
  selectDetailRelationCards,
  selectDetailShadows,
  selectDetailTitle,
  selectDetailVisibleSections,
  selectDurationDraft,
  selectDurationValidationMessage,
  selectEditNavigationTitle,
  selectEditShowsIdentityHeader,
  selectEditWorkingCopy,
  selectEditableSections,
  selectIsDetailPresented,
  selectIsDetailSaving,
  selectIsEditDirty,
  selectIsEditValid,
  selectIsRelationDraftCommittable,
  selectIsSaveEnabled,
  selectManagedRelation,
  selectObservedFocusTime,
  selectRelationDraft,
  selectRelationEmptyState,
  selectRelationReadOnlyReason,
} from '../EndeavorDetailSelectors'
import type { EndeavorDetailState } from '../EndeavorDetailState'

const rootWith = (endeavorDetail: EndeavorDetailState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  auth: initialAuthState,
})

describe('presentation', () => {
  it('reports nothing presented while the surface is closed', () => {
    const closed = rootWith(detailStateMocks.closed)
    expect(selectIsDetailPresented(closed)).toBe(false)
    expect(selectDetailEndeavor(closed)).toBeNull()
    expect(selectDetailTitle(closed)).toBe('')
  })

  it('reports the presented endeavor and its display title', () => {
    const presented = rootWith(detailStateMocks.presentedTask)
    expect(selectIsDetailPresented(presented)).toBe(true)
    expect(selectDetailTitle(presented)).toBe(detailEndeavorMocks.task.title)
  })

  it('reports which editor is open', () => {
    expect(selectDetailDestination(rootWith(detailStateMocks.durationOpen))).toEqual(
      { kind: 'duration' },
    )
    expect(
      selectDetailDestination(rootWith(detailStateMocks.presentedTask)),
    ).toBeNull()
  })
})

describe('the read surface’s cards', () => {
  it('lists every section, empty ones included', () => {
    expect(
      selectDetailFieldsBySection(rootWith(detailStateMocks.presentedTask)),
    ).toHaveLength(3)
  })

  it('omits an empty section from the ones worth a header', () => {
    const sections = selectDetailVisibleSections(
      rootWith(detailStateMocks.presentedEvent),
    )
    expect(sections.every((model) => model.fields.length > 0)).toBe(true)
  })

  it('answers empty while nothing is presented', () => {
    expect(selectDetailFieldsBySection(rootWith(detailStateMocks.closed))).toEqual(
      [],
    )
    expect(selectDetailRelationCards(rootWith(detailStateMocks.closed))).toEqual(
      [],
    )
  })

  it('marks a relation the kind cannot manage as inert', () => {
    const cards = selectDetailRelationCards(
      rootWith(detailStateMocks.presentedEvent),
    )
    expect(
      cards.find((card) => card.relation === EndeavorRelation.performances)
        ?.isManageable,
    ).toBe(false)
  })

  it('leads the header with the kind, then the status', () => {
    const badges = selectDetailBadges(rootWith(detailStateMocks.presentedTask))
    expect(badges[0]?.kind).toBe('kind')
    expect(badges[1]?.kind).toBe('status')
  })
})

describe('the editor’s own reads', () => {
  it('exposes the working copy while an editor is open', () => {
    expect(
      selectEditWorkingCopy(rootWith(detailStateMocks.editingTask))?.id,
    ).toBe(detailEndeavorMocks.task.id)
    expect(
      selectEditWorkingCopy(rootWith(detailStateMocks.presentedTask)),
    ).toBeNull()
  })

  it('narrows the editable sections to the focused field', () => {
    const sections = selectEditableSections(
      rootWith(detailStateMocks.editingTitleOnly),
    )
    expect(sections).toHaveLength(1)
    expect(sections[0]?.fields).toEqual([EndeavorField.title])
  })

  it('shows the identity header only on the full form', () => {
    expect(
      selectEditShowsIdentityHeader(rootWith(detailStateMocks.editingTask)),
    ).toBe(true)
    expect(
      selectEditShowsIdentityHeader(rootWith(detailStateMocks.editingTitleOnly)),
    ).toBe(false)
  })

  it('titles the editor by its focus', () => {
    expect(selectEditNavigationTitle(rootWith(detailStateMocks.editingTask))).toBe(
      'Edit',
    )
    expect(
      selectEditNavigationTitle(rootWith(detailStateMocks.editingTitleOnly)),
    ).toBe('Edit title')
  })

  it('reports dirty, valid and save-enabled independently', () => {
    expect(selectIsEditDirty(rootWith(detailStateMocks.editingTask))).toBe(false)
    expect(selectIsEditDirty(rootWith(detailStateMocks.editingDirty))).toBe(true)
    expect(selectIsEditValid(rootWith(detailStateMocks.editingInvalid))).toBe(
      false,
    )
    expect(selectIsSaveEnabled(rootWith(detailStateMocks.editingDirty))).toBe(
      true,
    )
  })

  it('refuses Save while one is already in flight', () => {
    expect(selectIsDetailSaving(rootWith(detailStateMocks.saving))).toBe(true)
    expect(selectIsSaveEnabled(rootWith(detailStateMocks.saving))).toBe(false)
  })

  it('surfaces the last failure for the banner', () => {
    expect(
      selectDetailException(rootWith(detailStateMocks.saveFailed))?.kind,
    ).toBe('localPersistenceFailed')
    expect(
      selectDetailException(rootWith(detailStateMocks.editingTask)),
    ).toBeNull()
  })
})

describe('the duration profile’s reads', () => {
  it('exposes the draft while the profile is open', () => {
    expect(
      selectDurationDraft(rootWith(detailStateMocks.durationOpen)),
    ).not.toBeNull()
    expect(selectDurationDraft(rootWith(detailStateMocks.editingTask))).toBeNull()
  })

  it('computes the observed focus time from the performances', () => {
    const observed = selectObservedFocusTime(
      rootWith(detailStateMocks.durationOpen),
    )
    expect(observed?.seconds).toBe(1800)
    expect(observed?.sampleCount).toBe(3)
  })

  it('answers null for the observed card while nothing is presented', () => {
    expect(selectObservedFocusTime(rootWith(detailStateMocks.closed))).toBeNull()
  })

  it('says nothing about validation on a coherent profile', () => {
    expect(
      selectDurationValidationMessage(rootWith(detailStateMocks.durationOpen)),
    ).toBeNull()
  })
})

describe('the relation reads', () => {
  it('lists the performances, defers and shadows as stored', () => {
    const withSessions = rootWith(detailStateMocks.performancesOpen)
    expect(selectDetailPerformances(withSessions)).toHaveLength(3)
    expect(selectDetailDefers(withSessions)).toEqual([])
    expect(selectDetailShadows(rootWith(detailStateMocks.presentedEvent))).toHaveLength(
      1,
    )
  })

  it('names the relation being managed', () => {
    expect(selectManagedRelation(rootWith(detailStateMocks.hostsOpen))).toBe(
      EndeavorRelation.hosts,
    )
    expect(
      selectManagedRelation(rootWith(detailStateMocks.presentedTask)),
    ).toBeNull()
  })

  it('states WHY a relation is read-only, instead of merely hiding the form', () => {
    expect(
      selectRelationReadOnlyReason(rootWith(detailStateMocks.performancesReadOnly)),
    ).toBe("This endeavor's kind can't record sessions.")
    expect(
      selectRelationReadOnlyReason(rootWith(detailStateMocks.performancesOpen)),
    ).toBeNull()
  })

  it('picks the empty-state copy that matches editability', () => {
    expect(
      selectRelationEmptyState(rootWith(detailStateMocks.performancesOpen))
        ?.message,
    ).toContain('log one below by hand')
    expect(
      selectRelationEmptyState(rootWith(detailStateMocks.performancesReadOnly))
        ?.message,
    ).toBe('Sessions logged against this endeavor will appear here.')
  })

  it('reports the attached hosts and the candidates, each with its reason', () => {
    expect(
      selectDetailAttachedHosts(rootWith(detailStateMocks.presentedEvent)),
    ).toEqual([EndeavorHost.googleCalendar])
    const candidates = selectDetailHostCandidates(
      rootWith(detailStateMocks.hostsOpen),
    )
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((candidate) => !candidate.isAttachable)).toBe(true)
  })

  it('reports whether the open add form can be committed', () => {
    expect(selectRelationDraft(rootWith(detailStateMocks.hostsOpen))).toBeNull()
    expect(
      selectIsRelationDraftCommittable(rootWith(detailStateMocks.hostsOpen)),
    ).toBe(false)
  })
})
