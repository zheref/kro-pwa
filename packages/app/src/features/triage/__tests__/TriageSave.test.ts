import { EndeavorHost } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { triageEndeavorFixtures } from '../TriageMocks'
import {
  TRIAGE_RETRIES_PUSH_AUTOMATICALLY,
  TriagePushDeferral,
  TriagePushTransport,
  TriageSaveStep,
  triagePushNotice,
  triagePushOutcomeFor,
  triageRemotePushHosts,
  triageSaveOrder,
} from '../TriageSave'

describe('triageSaveOrder', () => {
  it('puts the local store first — the durability guarantee is the order', () => {
    expect(triageSaveOrder[0]).toBe(TriageSaveStep.localStore)
  })

  it('puts the remote push second, and there is no third step', () => {
    expect(triageSaveOrder).toEqual([
      TriageSaveStep.localStore,
      TriageSaveStep.remotePush,
    ])
  })

  it('records canon’s known gap: nothing retries a failed push on a timer', () => {
    expect(TRIAGE_RETRIES_PUSH_AUTOMATICALLY).toBe(false)
  })
})

describe('triageRemotePushHosts', () => {
  it('finds nothing to push for a purely local endeavor', () => {
    expect(
      triageRemotePushHosts(triageEndeavorFixtures.unscheduledTask),
    ).toEqual([])
  })

  it('targets Kro Cloud for a cloud-hosted endeavor', () => {
    expect(
      triageRemotePushHosts(triageEndeavorFixtures.cloudHostedTask),
    ).toEqual([EndeavorHost.supabase])
  })

  it('targets an external host for a tourist', () => {
    expect(
      triageRemotePushHosts(triageEndeavorFixtures.touristReminder),
    ).toEqual([EndeavorHost.appleReminders])
  })

  it('targets only the external half of an enhanced row', () => {
    expect(triageRemotePushHosts(triageEndeavorFixtures.enhancedTask)).toEqual([
      EndeavorHost.appleReminders,
    ])
  })
})

describe('triagePushOutcomeFor', () => {
  it('short-circuits a purely local endeavor before consulting the transport', () => {
    expect(
      triagePushOutcomeFor({
        endeavor: triageEndeavorFixtures.unscheduledTask,
        transport: TriagePushTransport.unavailable,
      }),
    ).toEqual({ kind: 'notApplicable' })
  })

  it('reports a push that landed, with the hosts that took it', () => {
    expect(
      triagePushOutcomeFor({
        endeavor: triageEndeavorFixtures.cloudHostedTask,
        transport: TriagePushTransport.succeeded,
      }),
    ).toEqual({ kind: 'pushed', hosts: [EndeavorHost.supabase] })
  })

  it('defers when no transport is wired yet — kro-pwa today', () => {
    expect(
      triagePushOutcomeFor({
        endeavor: triageEndeavorFixtures.cloudHostedTask,
        transport: TriagePushTransport.unavailable,
      }),
    ).toEqual({
      kind: 'deferred',
      hosts: [EndeavorHost.supabase],
      reason: TriagePushDeferral.transportUnavailable,
    })
  })

  it('defers when the push was attempted and failed — the offline case', () => {
    expect(
      triagePushOutcomeFor({
        endeavor: triageEndeavorFixtures.cloudHostedTask,
        transport: TriagePushTransport.failed,
      }),
    ).toEqual({
      kind: 'deferred',
      hosts: [EndeavorHost.supabase],
      reason: TriagePushDeferral.pushFailed,
    })
  })

  it('never reports a local-only row as pending sync, whatever the transport says', () => {
    for (const transport of Object.values(TriagePushTransport)) {
      expect(
        triagePushOutcomeFor({
          endeavor: triageEndeavorFixtures.unscheduledTask,
          transport,
        }).kind,
      ).toBe('notApplicable')
    }
  })
})

describe('triagePushNotice', () => {
  it('says nothing when there was nothing to push', () => {
    expect(triagePushNotice({ kind: 'notApplicable' })).toBeNull()
  })

  it('says nothing when the push landed', () => {
    expect(
      triagePushNotice({ kind: 'pushed', hosts: [EndeavorHost.supabase] }),
    ).toBeNull()
  })

  it('tells the user the decision is SAFE when sync is not set up yet', () => {
    const notice = triagePushNotice({
      kind: 'deferred',
      hosts: [EndeavorHost.supabase],
      reason: TriagePushDeferral.transportUnavailable,
    })

    expect(notice).toContain('Saved on this device')
  })

  it('tells the user the decision is safe when the push failed outright', () => {
    const notice = triagePushNotice({
      kind: 'deferred',
      hosts: [EndeavorHost.appleReminders],
      reason: TriagePushDeferral.pushFailed,
    })

    expect(notice).toContain('Saved on this device')
    expect(notice).toContain('next save')
  })
})
