import { describe, expect, it } from 'vitest'
import { EndeavorActivityExceptions } from '../EndeavorActivityException'
import { EndeavorActivityMocks } from '../EndeavorActivityMocks'
import {
  withActivityException,
  withActivityLoadStarted,
  withActivityLoaded,
  withActivityRequested,
} from '../EndeavorActivityShifters'

const loaded = EndeavorActivityMocks.loadedMany

describe('withActivityRequested', () => {
  it('remembers a newly opened endeavor on the All tab', () => {
    const next = withActivityRequested(EndeavorActivityMocks.idle, 'a')
    expect(next.endeavorId).toBe('a')
    expect(next.tab).toBe('all')
  })
  it('resets the tab when the user switches endeavors', () => {
    expect(
      withActivityRequested(
        EndeavorActivityMocks.loadedManyCompleteTab,
        'other',
      ).tab,
    ).toBe('all')
  })
  it('keeps the tab when the same endeavor is re-requested', () => {
    const state = EndeavorActivityMocks.loadedManyCompleteTab
    expect(withActivityRequested(state, state.endeavorId ?? '')).toBe(state)
  })
})

describe('withActivityLoadStarted', () => {
  it('moves an idle screen to loading', () => {
    expect(withActivityLoadStarted(EndeavorActivityMocks.idle).load.kind).toBe(
      'loading',
    )
  })
  it('clears a previous failure when retrying', () => {
    expect(
      withActivityLoadStarted(EndeavorActivityMocks.failed).load.kind,
    ).toBe('loading')
  })
  it('keeps the chosen tab while reloading', () => {
    expect(
      withActivityLoadStarted(EndeavorActivityMocks.loadedManyCompleteTab).tab,
    ).toBe('complete')
  })
})

describe('withActivityLoaded', () => {
  const payload = (() => {
    if (loaded.load.kind !== 'loaded') throw new Error('fixture')
    return loaded.load
  })()
  it('installs the endeavor and its rows', () => {
    const next = withActivityLoaded(EndeavorActivityMocks.loading, payload)
    expect(next.load.kind === 'loaded' && next.load.rows).toHaveLength(4)
  })
  it('stamps the loaded endeavor’s id', () => {
    expect(
      withActivityLoaded(EndeavorActivityMocks.idle, payload).endeavorId,
    ).toBe(payload.endeavor.id)
  })
  it('accepts an endeavor with no rows', () => {
    const empty = EndeavorActivityMocks.loadedEmpty.load
    if (empty.kind !== 'loaded') throw new Error('fixture')
    const next = withActivityLoaded(EndeavorActivityMocks.loading, empty)
    expect(next.load.kind === 'loaded' && next.load.rows).toEqual([])
  })
})

describe('withActivityException', () => {
  it('records a not-found failure', () => {
    const next = withActivityException(
      EndeavorActivityMocks.loading,
      EndeavorActivityExceptions.endeavorNotFound('x'),
    )
    expect(next.load.kind === 'failed' && next.load.exception.kind).toBe(
      'endeavorNotFound',
    )
  })
  it('replaces previously loaded rows', () => {
    expect(
      withActivityException(
        loaded,
        EndeavorActivityExceptions.loadFailed('disk'),
      ).load.kind,
    ).toBe('failed')
  })
  it('keeps the requested endeavor id', () => {
    expect(
      withActivityException(loaded, EndeavorActivityExceptions.unknown('x'))
        .endeavorId,
    ).toBe(loaded.endeavorId)
  })
})
