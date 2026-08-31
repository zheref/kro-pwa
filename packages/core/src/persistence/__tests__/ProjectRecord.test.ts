import { describe, expect, it } from 'vitest'
import { MOCK_NOW } from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { makeProject } from '../../domain/shared/EndeavorList'
import { epochMillisFromDate } from '../EpochMillis'
import {
  projectFromRecord,
  projectOwner,
  projectRecordFromProject,
} from '../ProjectRecord'
import { isRecordDirty, isRecordSoftDeleted } from '../SyncBookkeeping'

const NOW_MILLIS = epochMillisFromDate(MOCK_NOW)

describe('project round-trip — over the columns the row actually has', () => {
  it('restores id and title exactly', () => {
    const project = makeProject({ id: 'project-finances', title: 'Finances' })
    const record = projectRecordFromProject(project, { now: MOCK_NOW })
    expect(projectFromRecord(record)).toEqual(project)
  })

  it('DROPS colour, because canon`s row has no column for it', () => {
    const project = makeProject({
      id: 'project-finances',
      title: 'Finances',
      color: '#4C6EF5',
    })
    const record = projectRecordFromProject(project, { now: MOCK_NOW })
    expect(projectFromRecord(record).color).toBeNull()
  })

  it('restores inActivity as false — transient state is never persisted', () => {
    const project = makeProject({
      id: 'project-1',
      title: 'Moving house',
      inActivity: true,
    })
    const record = projectRecordFromProject(project, { now: MOCK_NOW })
    expect(projectFromRecord(record).inActivity).toBe(false)
  })

  it('keeps the discriminant — a stored list is still a project', () => {
    const record = projectRecordFromProject(
      makeProject({ id: 'p', title: 'P' }),
      { now: MOCK_NOW },
    )
    expect(projectFromRecord(record).source).toBe('project')
  })
})

describe('projectRecordFromProject — watermarks and ownership', () => {
  const project = makeProject({ id: 'project-1', title: 'Finances' })

  it('stamps the watermark from the `now` it was given', () => {
    expect(
      projectRecordFromProject(project, { now: MOCK_NOW }).updatedAtEpochMillis,
    ).toBe(NOW_MILLIS)
  })

  it('leaves a new row dirty and untombstoned', () => {
    const record = projectRecordFromProject(project, { now: MOCK_NOW })
    expect(isRecordDirty(record)).toBe(true)
    expect(isRecordSoftDeleted(record)).toBe(false)
  })

  it('fills createdAt with `now` when the caller has no earlier value', () => {
    expect(
      projectRecordFromProject(project, { now: MOCK_NOW }).createdAt,
    ).toEqual(MOCK_NOW)
  })

  it('preserves an explicit createdAt from an existing row', () => {
    const earlier = new Date(2025, 5, 1, 12, 0, 0)
    expect(
      projectRecordFromProject(project, { now: MOCK_NOW, createdAt: earlier })
        .createdAt,
    ).toEqual(earlier)
  })

  it('records a user owner', () => {
    const record = projectRecordFromProject(project, {
      now: MOCK_NOW,
      ownerUserId: 'user-ada',
    })
    expect(projectOwner(record)).toEqual({ type: 'user', userId: 'user-ada' })
  })

  it('records a group owner', () => {
    const record = projectRecordFromProject(project, {
      now: MOCK_NOW,
      ownerGroupId: 'group-home',
    })
    expect(projectOwner(record)).toEqual({
      type: 'group',
      groupId: 'group-home',
    })
  })

  it('answers no owner for an anonymous row', () => {
    expect(
      projectOwner(projectRecordFromProject(project, { now: MOCK_NOW })),
    ).toBeNull()
  })
})
