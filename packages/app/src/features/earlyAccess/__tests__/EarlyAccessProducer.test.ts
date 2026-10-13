import type { EarlyAccessResponse } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import type { EarlyAccessService } from '../../../library/store'
import {
  makeRecordingAnalyticsService,
  makeRecordingEarlyAccessService,
} from '../../../library/store'
import {
  userDidEditEmail,
  userDidEditHoneypot,
  userDidPickPlatform,
} from '../EarlyAccessFeature'
import { joinEarlyAccessThunk } from '../EarlyAccessProducer'

const setup = (service?: EarlyAccessService) => {
  const analytics = makeRecordingAnalyticsService()
  const recording = makeRecordingEarlyAccessService()
  const store = makeStore({
    ...stubbedThunkExtra,
    analyticsService: analytics,
    earlyAccessService: service ?? recording,
  })
  return { store, analytics, recording }
}

const submit = async (
  email: string,
  options: {
    service?: EarlyAccessService
    platform?: 'android'
    website?: string
  } = {},
) => {
  const ctx = setup(options.service)
  ctx.store.dispatch(userDidEditEmail({ value: email }))
  if (options.platform)
    ctx.store.dispatch(userDidPickPlatform({ platform: options.platform }))
  if (options.website)
    ctx.store.dispatch(userDidEditHoneypot({ value: options.website }))
  const result = await ctx.store.dispatch(joinEarlyAccessThunk())
  return { ...ctx, result, submit: ctx.store.getState().earlyAccess.submit }
}

const events = (analytics: ReturnType<typeof makeRecordingAnalyticsService>) =>
  analytics.calls.map((call) =>
    call.kind === 'track' ? call.event : 'identify',
  )

describe('joinEarlyAccessThunk', () => {
  it('joins: sends the trimmed request once and lands on joined with the receipt', async () => {
    const { recording, submit: state } = await submit('  ada@example.com ')
    expect(recording.calls).toEqual([
      {
        email: 'ada@example.com',
        platform: 'ios',
        source: 'landing',
        locale: null,
      },
    ])
    expect(state.kind).toBe('joined')
    expect(state.kind === 'joined' && state.receipt.position).toBeNull()
  })

  it('tracks submit before and joined after, carrying platform and hasPosition — never the address', async () => {
    const { analytics } = await submit('ada@example.com', {
      platform: 'android',
    })
    expect(analytics.calls).toEqual([
      {
        kind: 'track',
        event: 'early_access_submit',
        props: { platform: 'android', source: 'landing' },
      },
      {
        kind: 'track',
        event: 'early_access_joined',
        props: { platform: 'android', hasPosition: false },
      },
    ])
    expect(JSON.stringify(analytics.calls)).not.toContain('ada@example.com')
  })

  it('an invalid address fails invalidEmail WITHOUT calling the service', async () => {
    const { recording, submit: state, analytics } = await submit('ada@')
    expect(recording.calls).toEqual([])
    expect(state).toMatchObject({
      kind: 'failed',
      exception: { kind: 'invalidEmail' },
    })
    expect(events(analytics)).toEqual([
      'early_access_submit',
      'early_access_failed',
    ])
  })

  it('an empty form is invalid too — the first press explains itself', async () => {
    const { submit: state } = await submit('')
    expect(state).toMatchObject({
      kind: 'failed',
      exception: { kind: 'invalidEmail' },
    })
  })

  it('a filled honeypot resolves joined with a synthetic receipt — no call, no analytics', async () => {
    const {
      recording,
      analytics,
      submit: state,
    } = await submit('bot@example.com', {
      website: 'https://spam.invalid',
    })
    expect(recording.calls).toEqual([])
    expect(analytics.calls).toEqual([])
    expect(state.kind === 'joined' && state.receipt.id).toBe('honeypot')
  })

  it('already@ maps to alreadyJoined (409)', async () => {
    const { submit: state, analytics } = await submit('already@kro.invalid')
    expect(state).toMatchObject({
      kind: 'failed',
      exception: { kind: 'alreadyJoined', recoverable: false },
    })
    expect(analytics.calls.at(-1)).toEqual({
      kind: 'track',
      event: 'early_access_failed',
      props: { kind: 'alreadyJoined' },
    })
  })

  it('offline@ (a TypeError) maps to offline', async () => {
    const { submit: state } = await submit('offline@kro.invalid')
    expect(state).toMatchObject({
      kind: 'failed',
      exception: { kind: 'offline' },
    })
  })

  it('unavailable@ (503) maps to unavailable', async () => {
    const { submit: state } = await submit('unavailable@kro.invalid')
    expect(state).toMatchObject({
      kind: 'failed',
      exception: { kind: 'unavailable' },
    })
  })

  it('a malformed receipt from the wire is an unknown failure, not a crash', async () => {
    const malformed: EarlyAccessService = {
      join: async () =>
        ({
          id: 'x',
          email: 'a@b.co',
          platform: 'zzz',
          position: null,
          joined_at: 'nope',
        }) as EarlyAccessResponse,
    }
    const { submit: state } = await submit('ada@example.com', {
      service: malformed,
    })
    expect(state).toMatchObject({
      kind: 'failed',
      exception: { kind: 'unknown' },
    })
  })

  it('a service that throws a bare 500 resolves unknown — the thunk never rejects', async () => {
    const broken: EarlyAccessService = {
      join: async () => {
        throw Object.assign(new Error('boom'), { status: 500 })
      },
    }
    const { result, submit: state } = await submit('ada@example.com', {
      service: broken,
    })
    expect(result.type).toBe('earlyAccess/onJoinCompleted/fulfilled')
    expect(state).toMatchObject({
      kind: 'failed',
      exception: { kind: 'unknown' },
    })
  })

  it('a second press while submitting is ignored — one request, not two', async () => {
    const ctx = setup()
    ctx.store.dispatch(userDidEditEmail({ value: 'ada@example.com' }))
    const first = ctx.store.dispatch(joinEarlyAccessThunk())
    const second = ctx.store.dispatch(joinEarlyAccessThunk())
    await Promise.all([first, second])
    expect(ctx.recording.calls).toHaveLength(1)
  })
})
