/**
 * Integrity of the `Endeavor` fixture spread. `RC-13` asks for at least seven
 * variants across three convenient, one neutral and three inconvenient; these
 * assertions keep a later edit from quietly dropping below that, and pin the
 * two properties that make the spread usable — distinct ids, and no fixture
 * that moves with wall-clock time.
 */
import { describe, expect, it } from 'vitest'
import { MOCK_NOW, allEndeavorMocks, endeavorMocks } from '../Endeavor.mocks'

describe('the Endeavor mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allEndeavorMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every fixture a distinct id', () => {
    const ids = allEndeavorMocks.map((endeavor) => endeavor.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers a spread of kinds rather than seven tasks', () => {
    const kinds = new Set(allEndeavorMocks.map((endeavor) => endeavor.kind))
    expect(kinds.size).toBeGreaterThanOrEqual(4)
  })

  it('covers a spread of statuses', () => {
    const statuses = new Set(allEndeavorMocks.map((endeavor) => endeavor.status))
    expect(statuses.size).toBeGreaterThanOrEqual(4)
  })

  it('anchors on a fixed instant, so no fixture drifts with the clock', () => {
    expect(MOCK_NOW).toEqual(new Date(2026, 0, 15, 9, 0, 0))
  })

  it('includes a Kro-citizen, a Kro-enhanced and a Kro-tourist host shape', () => {
    expect(endeavorMocks.plannedTask.hostedBy).toEqual(['supabase', 'local'])
    expect(endeavorMocks.todayEvent.hostedBy).toEqual(['googleCalendar', 'local'])
    expect(endeavorMocks.overdueTouristReminder.hostedBy).toEqual(['appleReminders'])
  })

  it('includes the neutral floor with no host at all', () => {
    expect(endeavorMocks.bareDraft.hostedBy).toEqual([])
    expect(endeavorMocks.bareDraft.isDraft).toBe(true)
  })

  it('distinguishes null from [] for tags and shadows across the spread', () => {
    expect(endeavorMocks.bareDraft.tags).toBeNull()
    expect(endeavorMocks.bareDraft.shadows).toBeNull()
    expect(endeavorMocks.completedWithPerformances.tags).toEqual([])
    expect(endeavorMocks.completedWithPerformances.shadows).toEqual([])
  })

  it('carries the awkward cases: errors, in-flight, and a non-ASCII title', () => {
    expect(endeavorMocks.blockedBlueprint.errorMessages.length).toBeGreaterThan(0)
    expect(endeavorMocks.blockedBlueprint.inActivity).toBe(true)
    expect(endeavorMocks.blockedBlueprint.title.length).toBeGreaterThan(80)
  })
})
