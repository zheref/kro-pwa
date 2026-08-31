/**
 * The four session sound roles: the mapping itself, and the promise that an
 * unplayable cue is silent rather than a failure.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  type SessionSoundRole,
  makeLiveAudioFeedbackService,
  makeStubbedAudioFeedbackService,
  sessionSoundAssetGaps,
  sessionSoundAssets,
  sessionSoundRoles,
} from '../AudioFeedbackService'

describe('sessionSoundAssets', () => {
  it('maps all four of canon\'s roles, and only those four', () => {
    expect(Object.keys(sessionSoundAssets).sort()).toEqual(
      [...sessionSoundRoles].sort(),
    )
  })

  it('points every role at a bundled asset under /sounds', () => {
    for (const role of sessionSoundRoles) {
      expect(sessionSoundAssets[role]).toMatch(/^\/sounds\/[\w-]+\.mp3$/)
    }
  })

  it('gives each role a distinct asset, so two cues are never the same sound', () => {
    const paths = sessionSoundRoles.map((role) => sessionSoundAssets[role])
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('declares breakComplete as the one role with no shipped asset yet', () => {
    expect(sessionSoundAssetGaps).toEqual(['breakComplete'])
  })

  it('declares no gap for a role whose seed is shipped', () => {
    for (const role of [
      'sessionComplete',
      'taskCompleteDuringSession',
      'taskCompleteOutsideSession',
    ] satisfies SessionSoundRole[]) {
      expect(sessionSoundAssetGaps).not.toContain(role)
    }
  })
})

describe('liveAudioFeedbackService', () => {
  const playableAudio = () => {
    const played: string[] = []
    const service = makeLiveAudioFeedbackService({
      createAudio: (source) => {
        played.push(source)
        return { play: async () => {} }
      },
    })
    return { service, played }
  }

  it('plays the session-complete cue when a focus session ends', async () => {
    const { service, played } = playableAudio()
    await service.play('sessionComplete')
    expect(played).toEqual(['/sounds/videogame_success.mp3'])
  })

  it('plays the in-session cue when a task is completed during a session', async () => {
    const { service, played } = playableAudio()
    await service.play('taskCompleteDuringSession')
    expect(played).toEqual(['/sounds/progress_ding.mp3'])
  })

  it('plays a different cue when the same task is completed outside a session', async () => {
    const { service, played } = playableAudio()
    await service.play('taskCompleteOutsideSession')
    expect(played).toEqual(['/sounds/start_ping.mp3'])
  })

  it('falls back silently and logs when the asset is missing', async () => {
    const log = vi.fn()
    const service = makeLiveAudioFeedbackService({
      createAudio: () => ({
        play: async () => {
          throw new Error('NotSupportedError: no supported source')
        },
      }),
      log,
    })

    await expect(service.play('breakComplete')).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]?.[0]).toContain('breakComplete')
    expect(log.mock.calls[0]?.[0]).toContain('/sounds/break_complete.mp3')
  })

  it('falls back silently where the environment has no audio element at all', async () => {
    const log = vi.fn()
    const service = makeLiveAudioFeedbackService({
      createAudio: () => null,
      log,
    })

    await expect(service.play('sessionComplete')).resolves.toBeUndefined()
    expect(log).not.toHaveBeenCalled()
  })

  it('survives an autoplay-policy rejection without surfacing a failure', async () => {
    const log = vi.fn()
    const service = makeLiveAudioFeedbackService({
      createAudio: () => ({
        play: () => Promise.reject(new Error('NotAllowedError')),
      }),
      log,
    })

    await expect(service.play('sessionComplete')).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledTimes(1)
  })
})

describe('stubbedAudioFeedbackService', () => {
  it('records a role whose asset the fixture says is shipped', async () => {
    const service = makeStubbedAudioFeedbackService()
    await service.play('sessionComplete')
    expect(service.playedRoles()).toEqual(['sessionComplete'])
    expect(service.missedRoles()).toEqual([])
  })

  it('records the missing-asset role as missed, not played', async () => {
    const service = makeStubbedAudioFeedbackService()
    await service.play('breakComplete')
    expect(service.playedRoles()).toEqual([])
    expect(service.missedRoles()).toEqual(['breakComplete'])
  })

  it('lets a suite declare every asset missing, to exercise the silent path', async () => {
    const service = makeStubbedAudioFeedbackService({ availableAssets: [] })
    for (const role of sessionSoundRoles) await service.play(role)
    expect(service.playedRoles()).toEqual([])
    expect(service.missedRoles()).toEqual([...sessionSoundRoles])
  })
})
