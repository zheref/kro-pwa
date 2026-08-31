/**
 * The document-title Service — the web's stand-in for KroApple's macOS
 * menu-bar extra (KC-IS-#21, per epic KC-IS-#1).
 *
 * The behaviour worth pinning is the **base title**: releasing the timer must
 * restore whatever the route had, not a guessed constant, or the first session
 * a user runs silently renames every page they visit afterwards.
 */
import { describe, expect, it } from 'vitest'
import {
  type TitledDocumentLike,
  makeLiveDocumentTitleService,
  makeStubbedDocumentTitleService,
} from '../DocumentTitleService'

const documentWith = (title: string): TitledDocumentLike => ({ title })

describe('makeLiveDocumentTitleService', () => {
  it('shows the countdown in the tab while a session runs', async () => {
    const page = documentWith('Plan · Kro')
    const service = makeLiveDocumentTitleService({ document: page })

    await service.set('12:30 — Kro')

    expect(page.title).toBe('12:30 — Kro')
  })

  it('restores the route title the session interrupted, not a guessed one', async () => {
    const page = documentWith('Plan · Kro')
    const service = makeLiveDocumentTitleService({ document: page })

    await service.set('12:30 — Kro')
    await service.set('12:29 — Kro')
    await service.set(null)

    expect(page.title).toBe('Plan · Kro')
  })

  it('remembers the base from the first override, not the latest one', async () => {
    const page = documentWith('Do · Kro')
    const service = makeLiveDocumentTitleService({ document: page })

    await service.set('25:00 — Kro')
    await service.set('24:59 — Kro')
    await service.set(null)
    // A second session starts from whatever the route now reads.
    await service.set('05:00 — Kro')
    await service.set(null)

    expect(page.title).toBe('Do · Kro')
  })

  it('releasing without ever setting a title changes nothing', async () => {
    const page = documentWith('Earn · Kro')
    const service = makeLiveDocumentTitleService({ document: page })

    await service.set(null)

    expect(page.title).toBe('Earn · Kro')
  })

  it('is inert on a server render, where there is no document at all', async () => {
    const service = makeLiveDocumentTitleService({ document: null })

    await expect(service.set('12:30 — Kro')).resolves.toBeUndefined()
    expect(service.current()).toBe('')
  })
})

describe('makeStubbedDocumentTitleService', () => {
  it('records every value a session pushed, releases included', async () => {
    const service = makeStubbedDocumentTitleService()

    await service.set('25:00 — Kro')
    await service.set('24:59 — Kro')
    await service.set(null)

    expect(service.recordedTitles()).toEqual([
      '25:00 — Kro',
      '24:59 — Kro',
      null,
    ])
  })

  it('reads back the title it currently shows', async () => {
    const service = makeStubbedDocumentTitleService({ baseTitle: 'Find · Kro' })

    await service.set('01:00 — Kro')

    expect(service.current()).toBe('01:00 — Kro')
  })

  it('restores its fixture base title on release', async () => {
    const service = makeStubbedDocumentTitleService({ baseTitle: 'Find · Kro' })

    await service.set('01:00 — Kro')
    await service.set(null)

    expect(service.current()).toBe('Find · Kro')
  })
})
