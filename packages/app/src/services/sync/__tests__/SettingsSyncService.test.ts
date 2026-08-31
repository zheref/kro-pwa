import { cloudSyncOptions } from '@kro/core'
import { describe, expect, it } from 'vitest'
import type { CloudSettingEntry } from '../../../features/auth/CloudSettings'
import { makeStubbedSupabaseClientProvider } from '../../supabase/SupabaseClientProvider'
import {
  USER_SETTINGS_TABLE,
  makeLiveSettingsSyncService,
  makeStubbedSettingsSyncService,
} from '../SettingsSyncService'

const firstCloudOption = cloudSyncOptions[0]
if (firstCloudOption === undefined) throw new Error('no cloud-scoped option declared')

const entry = (
  key: string,
  value: CloudSettingEntry['value'],
  updatedAt: Date | null = null,
): CloudSettingEntry => ({ key, value, updatedAt })

describe('the table this repo is a client of', () => {
  it('names the table the KroApple migration creates, verbatim', () => {
    expect(USER_SETTINGS_TABLE).toBe('user_settings')
  })
})

describe('the stubbed service', () => {
  it('starts empty — a brand-new account has nothing stored', async () => {
    const service = makeStubbedSettingsSyncService()
    expect(await service.pullAll()).toEqual([])
  })

  it('returns whatever the account was seeded with', async () => {
    const stored = [entry(firstCloudOption.key, true)]
    const service = makeStubbedSettingsSyncService({ stored })
    expect(await service.pullAll()).toEqual(stored)
  })

  it('counts pulls, so "pulls only at launch and sign-in" is provable', async () => {
    const service = makeStubbedSettingsSyncService()
    expect(service.pullCount()).toBe(0)
    await service.pullAll()
    await service.pullAll()
    expect(service.pullCount()).toBe(2)
  })

  it('records each push payload, so "local-scoped keys never leave" is inspectable', async () => {
    const service = makeStubbedSettingsSyncService()
    await service.push([entry('a', true)])
    await service.push([entry('b', 2)])
    expect(service.pushes()).toEqual([[entry('a', true)], [entry('b', 2)]])
  })

  it('upserts the way the real table would, so a push-then-pull round-trips', async () => {
    const service = makeStubbedSettingsSyncService({
      stored: [entry('a', true), entry('b', 1)],
    })
    await service.push([entry('a', false)])
    expect(await service.pullAll()).toEqual([entry('a', false), entry('b', 1)])
  })

  it('records an empty push rather than hiding it, so a no-op is still observable', async () => {
    const service = makeStubbedSettingsSyncService()
    await service.push([])
    expect(service.pushes()).toEqual([[]])
  })

  it('can be scripted to fail a pull', async () => {
    const service = makeStubbedSettingsSyncService({
      pullFailure: new TypeError('Failed to fetch'),
    })
    await expect(service.pullAll()).rejects.toBeInstanceOf(TypeError)
  })

  it('can be scripted to fail a push', async () => {
    const service = makeStubbedSettingsSyncService({
      pushFailure: new TypeError('Failed to fetch'),
    })
    await expect(service.push([entry('a', true)])).rejects.toBeInstanceOf(TypeError)
  })
})

describe('the live service with no project configured', () => {
  const service = makeLiveSettingsSyncService({
    clientProvider: makeStubbedSupabaseClientProvider(),
  })

  it('reports cloud sync cleanly unavailable on a pull rather than crashing the launch', async () => {
    await expect(service.pullAll()).rejects.toMatchObject({ kind: 'unavailable' })
  })

  it('reports the same on a push', async () => {
    await expect(service.push([entry('a', true)])).rejects.toMatchObject({
      kind: 'unavailable',
    })
  })

  it('short-circuits an empty push before it ever asks for a client', async () => {
    await expect(service.push([])).resolves.toBeUndefined()
  })
})
