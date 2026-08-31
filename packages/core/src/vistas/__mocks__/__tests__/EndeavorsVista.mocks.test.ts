import { describe, expect, it } from 'vitest'
import {
  bindingsForGesture,
  operationGestureKinds,
  requiredFlagsOf,
  resolveEndeavorCapabilities,
} from '../../EndeavorCapabilities'
import { EndeavorsVistas } from '../../EndeavorsVistas'
import {
  allEndeavorsVistaMocks,
  endeavorsVistaMocks,
} from '../EndeavorsVista.mocks'

describe('the vista fixture spread', () => {
  it('ships eight variants, past `RC-13`’s floor of seven', () => {
    expect(allEndeavorsVistaMocks.length).toBeGreaterThanOrEqual(7)
    expect(allEndeavorsVistaMocks).toHaveLength(8)
  })

  it('gives every fixture a distinct id, so a test can name the one it means', () => {
    const ids = allEndeavorsVistaMocks.map((vista) => vista.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('aliases the real Find entry rather than re-declaring it', () => {
    expect(endeavorsVistaMocks.findLike).toBe(EndeavorsVistas.find)
  })
})

describe('the inconvenient fixtures', () => {
  it('displayOnly binds no operation at all', () => {
    expect(endeavorsVistaMocks.displayOnly.capabilities.operations).toEqual([])
    expect(endeavorsVistaMocks.displayOnly.lens.exposes.size).toBe(0)
  })

  it('maximalOperations binds every gesture kind at least once', () => {
    for (const kind of operationGestureKinds) {
      expect(
        bindingsForGesture(
          endeavorsVistaMocks.maximalOperations.capabilities,
          kind,
        ).length,
      ).toBeGreaterThan(0)
    }
  })

  it('withPersistedSearch arrives with the search field already filled', () => {
    expect(endeavorsVistaMocks.withPersistedSearch.lens.searchQuery).toBe(
      'groceries',
    )
  })

  it('flagGated loses its only binding when the flag is off, and regains it when on', () => {
    const capabilities = endeavorsVistaMocks.flagGated.capabilities
    expect(requiredFlagsOf(capabilities)).toEqual(['googleCalendarIntegration'])
    expect(
      resolveEndeavorCapabilities(capabilities, () => false).operations,
    ).toEqual([])
    expect(
      resolveEndeavorCapabilities(capabilities, () => true).operations,
    ).toHaveLength(1)
  })
})

describe('fixture hygiene', () => {
  it('leaves every fixture’s lens config-only, never mid-edit', () => {
    for (const vista of allEndeavorsVistaMocks) {
      expect(vista.lens.sort).toEqual([])
    }
  })

  it('gives every fixture a presentation, since a vista cannot render without one', () => {
    for (const vista of allEndeavorsVistaMocks) {
      expect(vista.presentation.cardVariant.length).toBeGreaterThan(0)
      expect(vista.presentation.density.length).toBeGreaterThan(0)
    }
  })

  it('reads no clock — a second import is byte-identical', async () => {
    const reimported = await import('../EndeavorsVista.mocks')
    expect(reimported.endeavorsVistaMocks.tasksAll).toEqual(
      endeavorsVistaMocks.tasksAll,
    )
  })
})
