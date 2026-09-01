import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok, type Result } from '../result'
import {
  GreetingExceptions,
  type GreetingException,
} from '../../models/GreetingException'

type GreetingResult = Result<string, GreetingException>

describe('ok', () => {
  it('carries the value a Producer resolved — greeting loaded from the service', () => {
    const result: GreetingResult = ok('Good morning, Ada.')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('Good morning, Ada.')
  })

  it('accepts a falsy value without collapsing it into a failure — an empty greeting body', () => {
    const result: GreetingResult = ok('')

    expect(result.ok).toBe(true)
    expect(isErr(result)).toBe(false)
  })

  it('produces a fresh container per call so two completions never alias', () => {
    const first = ok('a')
    const second = ok('a')

    expect(first).not.toBe(second)
    expect(first).toEqual(second)
  })
})

describe('err', () => {
  it('carries the typed exception a Producer caught — the phone went offline mid-request', () => {
    const result: GreetingResult = err(GreetingExceptions.offline())

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('offline')
  })

  it('keeps the recoverable flag intact so the surface can offer a retry', () => {
    const result: GreetingResult = err(GreetingExceptions.unauthorized())

    if (!result.ok) expect(result.error.recoverable).toBe(false)
  })

  it('never exposes a `value` field, so a careless read cannot pass for success', () => {
    const result: GreetingResult = err(GreetingExceptions.notFound())

    expect('value' in result).toBe(false)
  })
})

describe('isOk', () => {
  it('is true for a resolved success — the reducer takes the loaded arm', () => {
    expect(isOk(ok('Hello.'))).toBe(true)
  })

  it('is false for a resolved failure — the reducer takes the exception arm', () => {
    expect(isOk(err(GreetingExceptions.offline()))).toBe(false)
  })

  it('narrows the union so `value` is reachable without a cast', () => {
    const result: GreetingResult = ok('Welcome back, Grace.')

    if (isOk(result)) {
      expect(result.value.startsWith('Welcome')).toBe(true)
    } else {
      throw new Error('expected the success arm')
    }
  })
})

describe('isErr', () => {
  it('is true for a resolved failure — the service refused the request', () => {
    expect(isErr(err(GreetingExceptions.unauthorized()))).toBe(true)
  })

  it('is false for a resolved success — nothing to surface to the user', () => {
    expect(isErr(ok('Hi.'))).toBe(false)
  })

  it('narrows the union so `error.kind` is reachable without a cast', () => {
    const result: GreetingResult = err(
      GreetingExceptions.malformed('missing id'),
    )

    if (isErr(result)) {
      expect(result.error.kind).toBe('malformed')
    } else {
      throw new Error('expected the failure arm')
    }
  })
})
