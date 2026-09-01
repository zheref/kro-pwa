import { describe, expect, it } from 'vitest'
import { GreetingExceptions, greetingExceptionCopy } from '../GreetingException'

describe('GreetingExceptions factories', () => {
  it('offline is recoverable — reconnecting is all the user has to do', () => {
    const built = GreetingExceptions.offline()

    expect(built.kind).toBe('offline')
    expect(built.recoverable).toBe(true)
  })

  it('unauthorized is not recoverable — retrying the same request changes nothing', () => {
    expect(GreetingExceptions.unauthorized().recoverable).toBe(false)
  })

  it('malformed keeps the parse detail for the log while the user sees generic copy', () => {
    const built = GreetingExceptions.malformed('issued_at was not a date')

    expect(built.kind).toBe('malformed')
    expect(built.message).toBe('issued_at was not a date')
  })
})

describe('greetingExceptionCopy', () => {
  it('offers reconnect guidance when the request never left the device', () => {
    expect(greetingExceptionCopy(GreetingExceptions.offline())).toMatch(
      /offline/i,
    )
  })

  it('says the greeting is missing, not that something broke, on a 404', () => {
    expect(greetingExceptionCopy(GreetingExceptions.notFound())).toMatch(
      /could not find/i,
    )
  })

  it('never leaks the developer-facing message into user copy — a malformed payload', () => {
    const copy = greetingExceptionCopy(
      GreetingExceptions.malformed('issued_at was not a date'),
    )

    expect(copy).not.toContain('issued_at')
  })

  it('has a sentence for every member of the union — the exhaustiveness contract in practice', () => {
    const everyMember = [
      GreetingExceptions.offline(),
      GreetingExceptions.notFound(),
      GreetingExceptions.unauthorized(),
      GreetingExceptions.malformed('detail'),
      GreetingExceptions.unknown('detail'),
    ]

    for (const member of everyMember) {
      expect(greetingExceptionCopy(member).length).toBeGreaterThan(0)
    }
  })
})
