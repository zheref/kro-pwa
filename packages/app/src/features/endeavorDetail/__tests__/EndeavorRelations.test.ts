/**
 * The four relation surfaces: their lists, their per-kind read-only rules, and
 * the copy that has to **state why** rather than just disabling a control.
 */
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorRelation,
  PerformResolution,
  endeavorRelations,
  isRelationEditable,
  makeShadow,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import {
  attachedHostsOf,
  defersOf,
  hostAdapterUnavailableReason,
  hostAttachCandidatesOf,
  isExternalHost,
  isRelationDraftCommittable,
  performancesOf,
  relationEmptyState,
  relationReadOnlyReason,
  shadowsOf,
} from '../EndeavorRelations'

describe('a read-only relation states WHY, per relation', () => {
  it('says a calendar event cannot record sessions', () => {
    expect(
      relationReadOnlyReason(EndeavorRelation.performances, EndeavorKind.calendarEvent),
    ).toBe("This endeavor's kind can't record sessions.")
  })

  it('says a habit cannot record defers', () => {
    expect(relationReadOnlyReason(EndeavorRelation.defers, EndeavorKind.habit)).toBe(
      "This endeavor's kind can't record defers.",
    )
  })

  it('says a habit cannot change where it is mirrored', () => {
    expect(relationReadOnlyReason(EndeavorRelation.hosts, EndeavorKind.habit)).toBe(
      "This endeavor's kind can't change where it's mirrored.",
    )
  })

  it('says a blueprint cannot change its external mirrors', () => {
    expect(
      relationReadOnlyReason(EndeavorRelation.shadows, EndeavorKind.blueprint),
    ).toBe("This endeavor's kind can't change its external mirrors.")
  })

  it('says nothing at all when the relation IS editable', () => {
    expect(
      relationReadOnlyReason(EndeavorRelation.performances, EndeavorKind.task),
    ).toBeNull()
  })

  it('answers a reason for exactly the relations the domain matrix refuses', () => {
    for (const relation of endeavorRelations) {
      for (const kind of [
        EndeavorKind.task,
        EndeavorKind.habit,
        EndeavorKind.calendarEvent,
        EndeavorKind.blueprint,
      ]) {
        const reason = relationReadOnlyReason(relation, kind)
        expect(reason === null).toBe(isRelationEditable(relation, kind))
      }
    }
  })
})

describe('the empty states change with editability, as canon’s copy does', () => {
  it('invites an editable Performances list to log one by hand', () => {
    expect(
      relationEmptyState(EndeavorRelation.performances, EndeavorKind.task).message,
    ).toContain('log one below by hand')
  })

  it('does NOT invite that on a read-only one — there is no form to use', () => {
    const state = relationEmptyState(
      EndeavorRelation.performances,
      EndeavorKind.calendarEvent,
    )
    expect(state.message).toBe(
      'Sessions logged against this endeavor will appear here.',
    )
  })

  it('describes an un-deferred endeavor as having kept every due date', () => {
    const state = relationEmptyState(EndeavorRelation.defers, EndeavorKind.task)
    expect(state.title).toBe('Never deferred')
  })

  it('tells an un-mirrored endeavor apart by whether it can be mirrored', () => {
    expect(
      relationEmptyState(EndeavorRelation.hosts, EndeavorKind.task).message,
    ).toContain('Attach a provider')
    expect(
      relationEmptyState(EndeavorRelation.hosts, EndeavorKind.habit).message,
    ).toBe('This endeavor lives only in Kro.')
  })

  it('explains what a shadow even is on an empty list', () => {
    expect(
      relationEmptyState(EndeavorRelation.shadows, EndeavorKind.task).message,
    ).toContain('mirrored from a calendar')
  })
})

describe('the relation lists read straight off the endeavor', () => {
  it('lists the performances as stored', () => {
    expect(performancesOf(detailEndeavorMocks.taskWithSessions)).toHaveLength(3)
  })

  it('normalises a null shadow list to an empty array', () => {
    expect(shadowsOf(detailEndeavorMocks.task)).toEqual([])
    expect(shadowsOf(detailEndeavorMocks.event)).toHaveLength(1)
  })

  it('lists the defer history in order', () => {
    expect(defersOf(detailEndeavorMocks.task)).toEqual([])
  })
})

describe('hosts: the candidates are listed, and each says why it is unavailable', () => {
  it('treats Kro’s own two stores as internal, not attachable providers', () => {
    expect(isExternalHost(EndeavorHost.local)).toBe(false)
    expect(isExternalHost(EndeavorHost.supabase)).toBe(false)
    expect(isExternalHost(EndeavorHost.googleCalendar)).toBe(true)
  })

  it('reports only the external hosts an endeavor is actually on', () => {
    expect(attachedHostsOf(detailEndeavorMocks.event)).toEqual([
      EndeavorHost.googleCalendar,
    ])
    expect(attachedHostsOf(detailEndeavorMocks.task)).toEqual([])
  })

  it('offers every unattached external host as a candidate', () => {
    const candidates = hostAttachCandidatesOf(detailEndeavorMocks.event).map(
      (candidate) => candidate.host,
    )
    expect(candidates).not.toContain(EndeavorHost.googleCalendar)
    expect(candidates).toContain(EndeavorHost.appleReminders)
  })

  it('marks EVERY candidate unattachable in this build, with a reason', () => {
    for (const candidate of hostAttachCandidatesOf(detailEndeavorMocks.task)) {
      expect(candidate.isAttachable).toBe(false)
      expect(candidate.unavailableReason?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('says Apple’s two providers have no web equivalent at all', () => {
    expect(hostAdapterUnavailableReason(EndeavorHost.appleCalendar)).toContain(
      'no web equivalent',
    )
  })

  it('says Google Calendar is simply not connected yet', () => {
    expect(hostAdapterUnavailableReason(EndeavorHost.googleCalendar)).toContain(
      'not connected yet',
    )
  })
})

describe('an add form commits only once it means something', () => {
  it('refuses a performance with no duration', () => {
    expect(
      isRelationDraftCommittable({
        relation: 'performances',
        draft: {
          date: new Date(2026, 5, 18, 9),
          durationSeconds: 0,
          resolution: PerformResolution.complete,
          notes: '',
          rewardPoints: 0,
          wasCompletedInSession: false,
          editingIndex: null,
        },
      }),
    ).toBe(false)
  })

  it('accepts one with a positive duration', () => {
    expect(
      isRelationDraftCommittable({
        relation: 'performances',
        draft: {
          date: new Date(2026, 5, 18, 9),
          durationSeconds: 1500,
          resolution: PerformResolution.finished,
          notes: '',
          rewardPoints: 0,
          wasCompletedInSession: true,
          editingIndex: null,
        },
      }),
    ).toBe(true)
  })

  it('accepts a defer with no reason — the reason is optional by design', () => {
    expect(
      isRelationDraftCommittable({
        relation: 'defers',
        draft: { target: new Date(2026, 5, 19, 9), reason: '' },
      }),
    ).toBe(true)
  })

  it('refuses a shadow missing either half of its identity', () => {
    expect(
      isRelationDraftCommittable({
        relation: 'shadows',
        draft: {
          originalTitle: 'Team sync',
          sourceIdentifier: '   ',
          source: EndeavorHost.googleCalendar,
          kind: EndeavorKind.calendarEvent,
          group: '',
        },
      }),
    ).toBe(false)
  })

  it('accepts a complete shadow', () => {
    const shadow = makeShadow({
      originalTitle: 'Team sync',
      sourceIdentifier: 'gcal-9',
      kind: EndeavorKind.calendarEvent,
      source: EndeavorHost.googleCalendar,
    })
    expect(
      isRelationDraftCommittable({
        relation: 'shadows',
        draft: {
          originalTitle: shadow.originalTitle,
          sourceIdentifier: shadow.sourceIdentifier,
          source: shadow.source,
          kind: shadow.kind,
          group: '',
        },
      }),
    ).toBe(true)
  })

  it('refuses a host form with nothing selected', () => {
    expect(isRelationDraftCommittable({ relation: 'hosts', host: null })).toBe(
      false,
    )
    expect(
      isRelationDraftCommittable({
        relation: 'hosts',
        host: EndeavorHost.googleCalendar,
      }),
    ).toBe(true)
  })
})
