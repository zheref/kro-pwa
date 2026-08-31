import { describe, expect, it } from 'vitest'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { endeavorsVistaMocks } from '../__mocks__/EndeavorsVista.mocks'
import { NO_ENDEAVOR_CAPABILITIES } from '../EndeavorCapabilities'
import { EndeavorGroupingCriteria } from '../EndeavorCriteria'
import { UserFilter, makeEndeavorsLens } from '../EndeavorsLens'
import { makeEndeavorsLensSnapshot } from '../EndeavorsLensSnapshot'
import { everythingEndeavorsQuery } from '../EndeavorsQuery'
import {
  makeEndeavorsVista,
  vistaApplyingSnapshot,
  vistaWithLens,
} from '../EndeavorsVista'
import { CardVariant, makePresentationStyle } from '../PresentationStyle'

const bare = makeEndeavorsVista({
  id: 'bare',
  query: everythingEndeavorsQuery,
  lens: makeEndeavorsLens({ exposes: [UserFilter.search] }),
  capabilities: NO_ENDEAVOR_CAPABILITIES,
  presentation: makePresentationStyle({ cardVariant: CardVariant.standardRow }),
})

describe('makeEndeavorsVista', () => {
  it('defaults an unstated title to null — a screen that shows none says so', () => {
    expect(bare.title).toBeNull()
  })

  it('keeps a stated title verbatim', () => {
    expect(endeavorsVistaMocks.inbox.title).toBe('Inbox')
  })

  it('holds all four components under one id', () => {
    expect(Object.keys(bare).sort()).toEqual([
      'capabilities',
      'id',
      'lens',
      'presentation',
      'query',
      'title',
    ])
  })
})

describe('vistaWithLens — the one sanctioned transition', () => {
  it('returns a new vista carrying the replacement lens', () => {
    const swapped = vistaWithLens(
      bare,
      makeEndeavorsLens({ searchQuery: 'invoice' }),
    )
    expect(swapped.lens.searchQuery).toBe('invoice')
    expect(swapped).not.toBe(bare)
  })

  it('leaves the original vista’s lens untouched', () => {
    vistaWithLens(bare, makeEndeavorsLens({ searchQuery: 'invoice' }))
    expect(bare.lens.searchQuery).toBe('')
  })

  it('carries every immutable component through by reference', () => {
    const swapped = vistaWithLens(bare, makeEndeavorsLens())
    expect(swapped.id).toBe(bare.id)
    expect(swapped.query).toBe(bare.query)
    expect(swapped.capabilities).toBe(bare.capabilities)
    expect(swapped.presentation).toBe(bare.presentation)
  })
})

describe('vistaApplyingSnapshot — what a screen does on open', () => {
  it('restores the user’s saved narrowing onto the vista’s default lens', () => {
    const restored = vistaApplyingSnapshot(
      bare,
      makeEndeavorsLensSnapshot({
        hiddenKinds: [EndeavorKind.habit],
        showArchived: true,
        grouping: EndeavorGroupingCriteria.kind,
      }),
    )
    expect(restored.lens.hiddenKinds).toEqual(new Set([EndeavorKind.habit]))
    expect(restored.lens.showArchived).toBe(true)
    expect(restored.lens.grouping).toBe(EndeavorGroupingCriteria.kind)
  })

  it('never lets a stale save change which toggles the screen offers', () => {
    const restored = vistaApplyingSnapshot(bare, makeEndeavorsLensSnapshot())
    expect(restored.lens.exposes).toEqual(new Set([UserFilter.search]))
  })

  it('leaves the query, capabilities and presentation exactly as the screen declares them', () => {
    const restored = vistaApplyingSnapshot(
      endeavorsVistaMocks.tasksAll,
      makeEndeavorsLensSnapshot({ searchQuery: 'tax' }),
    )
    expect(restored.query).toBe(endeavorsVistaMocks.tasksAll.query)
    expect(restored.capabilities).toBe(
      endeavorsVistaMocks.tasksAll.capabilities,
    )
    expect(restored.presentation).toBe(
      endeavorsVistaMocks.tasksAll.presentation,
    )
  })

  it('is a no-op in effect when the save holds nothing but defaults', () => {
    const restored = vistaApplyingSnapshot(bare, makeEndeavorsLensSnapshot())
    expect(restored.lens).toEqual(bare.lens)
  })
})
