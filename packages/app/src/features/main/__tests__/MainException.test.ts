import { describe, expect, it } from 'vitest'
import { MainExceptions } from '../MainException'

describe('MainExceptions', () => {
  it('offers a retry when the Lists read fails — the store may just be busy', () => {
    const exception = MainExceptions.listsLoadFailed('database is closing')
    expect(exception.kind).toBe('listsLoadFailed')
    expect(exception.recoverable).toBe(true)
    expect(exception.message).toContain('database is closing')
  })

  it('offers a retry when a project could not be written', () => {
    expect(MainExceptions.projectCreateFailed('quota exceeded')).toMatchObject({
      kind: 'projectCreateFailed',
      recoverable: true,
    })
  })

  it('offers a retry when a delete could not be persisted', () => {
    expect(MainExceptions.projectDeleteFailed('offline')).toMatchObject({
      kind: 'projectDeleteFailed',
      recoverable: true,
    })
  })

  it('says what is wrong when a project name is blank, without naming a cause', () => {
    const exception = MainExceptions.projectTitleEmpty()
    expect(exception.kind).toBe('projectTitleEmpty')
    expect(exception.message).toBe('A project needs a name.')
  })

  it('carries the defensive fallback shape a rejected thunk lands in', () => {
    expect(MainExceptions.unknown('boom')).toEqual({
      kind: 'unknown',
      message: 'boom',
      recoverable: true,
    })
  })
})
