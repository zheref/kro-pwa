/**
 * The router-as-a-Service seam.
 *
 * There is no fixture JSON to assert against — this Service returns nothing,
 * it commands — so what is checked is the contract a Producer depends on: the
 * safe default, and a double that records every call.
 *
 * The **live** binding is not tested here because it does not live here: per
 * `RC-48` it is authored in `apps/web` (`app/liveNavigationService.ts`), and
 * its own spec sits beside it.
 */
import { describe, expect, it } from 'vitest'
import {
  makeRecordingNavigationService,
  stubbedNavigationService,
} from '../NavigationService'

describe('stubbedNavigationService', () => {
  it('does nothing rather than throwing — a server render has no router', () => {
    expect(() => {
      stubbedNavigationService.navigate('/my-day')
      stubbedNavigationService.replace('/inbox')
      stubbedNavigationService.back()
    }).not.toThrow()
  })

  it('is the default a store gets before a composition root wires one', () => {
    // A Producer dispatched on a server render must not blow up; it must
    // simply fail to navigate, which is the honest outcome.
    expect(stubbedNavigationService.navigate('/plan')).toBeUndefined()
  })
})

describe('makeRecordingNavigationService', () => {
  it('records each call in order, so a suite asserts on an outcome', () => {
    const service = makeRecordingNavigationService()

    service.navigate('/plan')
    service.replace('/earn')
    service.back()

    expect(service.calls).toEqual([
      { kind: 'navigate', path: '/plan' },
      { kind: 'replace', path: '/earn' },
      { kind: 'back', path: null },
    ])
  })

  it('starts empty', () => {
    expect(makeRecordingNavigationService().calls).toEqual([])
  })

  it('hands each caller its own recorder — no two suites share one', () => {
    const first = makeRecordingNavigationService()
    const second = makeRecordingNavigationService()

    first.navigate('/inbox')

    expect(second.calls).toEqual([])
  })

  it('records a back step with no path, since there is none', () => {
    const service = makeRecordingNavigationService()

    service.back()

    expect(service.calls[0]).toEqual({ kind: 'back', path: null })
  })
})
