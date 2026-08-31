/**
 * The timeline canvas's render tests, mirroring `TimelineFragment.stories`
 * (`RC-11`) — and where the issue's first two acceptance criteria are checked
 * as rendered facts.
 *
 * Every scene is built from #18's own fixtures and layout pass, never from a
 * hand-written placement list (`RC-31`): a canvas that drew rectangles the
 * layout could not produce would prove nothing about the layout.
 */
import type { Endeavor } from '@kro/core'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PLAN_REFERENCE_DAY,
  PLAN_REFERENCE_NOW,
  planAt,
  planDayFixtures,
  planEditSessionFixture,
} from '../../../PlanMocks'
import { startOfPlanDay } from '../../../PlanCalendar'
import {
  TIMELINE_HOUR_HEIGHT_PX,
  TIMELINE_MINIMUM_CARD_HEIGHT_PX,
} from '../../../PlanConstants'
import { TimelineDragHandle } from '../../../PlanEditSession'
import { timelinePlacements } from '../../../TimelineLayout'
import { timelineSlotCount } from '../../../TimelineSlots'
import {
  HANDLE_KEYBOARD_STEP_PX,
  TimelineFragment,
} from '../TimelineFragment'
import { installPointerEvents, pointer } from '../../__tests__/pointerEvents'

installPointerEvents()

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const selectedDate = startOfPlanDay(PLAN_REFERENCE_DAY)
const FULL_BAND = { start: 0, endExclusive: 24 }
const BUSINESS_BAND = { start: 8, endExclusive: 20 }

const placementsFor = (
  events: readonly Endeavor[],
  band = FULL_BAND,
) => timelinePlacements(events, { on: selectedDate, startHour: band.start })

const mount = (
  overrides: Partial<Parameters<typeof TimelineFragment>[0]> = {},
) =>
  render(
    <TimelineFragment
      placements={placementsFor(planDayFixtures.longBlockWithShortOverlaps)}
      selectedDate={selectedDate}
      now={PLAN_REFERENCE_NOW}
      band={FULL_BAND}
      isShowingToday
      slotCount={timelineSlotCount(FULL_BAND)}
      isQuickCreateAvailable
      quickCreate={null}
      editingEndeavorId={null}
      onViewDetail={() => {}}
      onHoldBlock={() => {}}
      onGrabHandle={() => {}}
      onDragHandle={() => {}}
      onReleaseHandle={() => {}}
      onTapOutsideEditing={() => {}}
      onPressSlot={() => {}}
      {...overrides}
    />,
  )

// ------------------------------------------------------------------ the grid

describe('the hour grid', () => {
  it('rules every hour in the band PLUS the one that closes it — 25 for a full day', () => {
    mount()

    expect(screen.getAllByTestId('plan-timeline-hour-rule')).toHaveLength(25)
  })

  it('rules only the band a narrowed preference asks for, still with its closing rule', () => {
    mount({
      band: BUSINESS_BAND,
      placements: placementsFor(
        planDayFixtures.longBlockWithShortOverlaps,
        BUSINESS_BAND,
      ),
      slotCount: timelineSlotCount(BUSINESS_BAND),
    })

    const rules = screen.getAllByTestId('plan-timeline-hour-rule')
    expect(rules).toHaveLength(13)
    expect(rules[0]?.dataset.hour).toBe('8')
    expect(rules[12]?.dataset.hour).toBe('20')
  })

  it('anchors the band to the top of the canvas, not to midnight', () => {
    mount({
      band: BUSINESS_BAND,
      placements: placementsFor(
        planDayFixtures.longBlockWithShortOverlaps,
        BUSINESS_BAND,
      ),
      slotCount: timelineSlotCount(BUSINESS_BAND),
    })

    // 08:00 is the first rule, so its row centres on y = 0 (less half a label
    // row). A midnight-anchored grid would put it 480px down.
    const first = screen.getAllByTestId('plan-timeline-hour-rule')[0]
    expect(first?.style.top).toBe('-9px')
  })

  it('gives the canvas exactly one hour height per hour in the band', () => {
    mount()

    expect(screen.getByTestId('plan-timeline-canvas').style.height).toBe(
      `${24 * TIMELINE_HOUR_HEIGHT_PX}px`,
    )
  })
})

// ----------------------------------------------------------------- the cards

describe('the event cards', () => {
  it('gives a short event nested inside a long one its OWN interactive column', () => {
    mount()

    const blocks = screen.getAllByTestId('plan-timeline-block')
    expect(blocks).toHaveLength(3)
    // Each is its own hit target — canon: *"long-press and drag recognition
    // remain available for every overlap column."*
    for (const block of blocks) {
      expect(block.querySelector('[data-testid="plan-timeline-block-surface"]')).toBeTruthy()
    }
  })

  it('never draws a card below the tappable floor, even a 10-minute one', () => {
    mount({ placements: placementsFor(planDayFixtures.fullDayLongAndShort) })

    const tiny = screen
      .getAllByTestId('plan-timeline-block')
      .find((block) => block.dataset.endeavorId === 'tiny-sync')
    expect(tiny?.style.height).toBe(`${TIMELINE_MINIMUM_CARD_HEIGHT_PX}px`)
  })

  it('marks a finished event inert, so history cannot be dragged by accident', () => {
    mount({ placements: placementsFor(planDayFixtures.pastEvent) })

    expect(
      screen.getByTestId('plan-timeline-block').dataset.past,
    ).toBe('true')
  })

  it('deepens the fill on the frame a finger lands, with no transition in', () => {
    mount({ placements: placementsFor(planDayFixtures.longSoloBlock) })
    const block = screen.getByTestId('plan-timeline-block')

    pointer('pointerDown', screen.getByTestId('plan-timeline-block-surface'), {
      clientX: 100,
      clientY: 100,
    })

    expect(block.dataset.pressed).toBe('true')
    expect(screen.getByTestId('plan-timeline-block-fill').style.transition).toBe(
      'none',
    )
  })

  it('emits viewDetail on a tap, with the endeavor the card is about', async () => {
    const onViewDetail = vi.fn()
    mount({
      placements: placementsFor(planDayFixtures.longSoloBlock),
      onViewDetail,
    })
    const surface = screen.getByTestId('plan-timeline-block-surface')

    pointer('pointerDown', surface, { clientX: 40, clientY: 40 })
    pointer('pointerUp', surface, { clientX: 40, clientY: 40 })

    expect(onViewDetail).toHaveBeenCalledTimes(1)
    expect(onViewDetail.mock.calls[0]?.[0]?.id).toBe('solo-standup')
  })

  it('arms edit mode after canon 0.6s hold, and does NOT also open detail', () => {
    const onHoldBlock = vi.fn()
    const onViewDetail = vi.fn()
    mount({
      placements: placementsFor(planDayFixtures.longSoloBlock),
      onHoldBlock,
      onViewDetail,
    })
    const surface = screen.getByTestId('plan-timeline-block-surface')

    pointer('pointerDown', surface, { clientX: 40, clientY: 40 })
    act(() => {
      vi.advanceTimersByTime(600)
    })
    pointer('pointerUp', surface, { clientX: 40, clientY: 40 })

    expect(onHoldBlock).toHaveBeenCalledTimes(1)
    expect(onViewDetail).not.toHaveBeenCalled()
  })

  it('never arms a past block however long it is held', () => {
    const onHoldBlock = vi.fn()
    mount({ placements: placementsFor(planDayFixtures.pastEvent), onHoldBlock })
    const surface = screen.getByTestId('plan-timeline-block-surface')

    pointer('pointerDown', surface, { clientX: 40, clientY: 40 })
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(onHoldBlock).not.toHaveBeenCalled()
  })
})

// ------------------------------------------------------------------ edit mode

describe('edit mode', () => {
  const editing = {
    placements: placementsFor(planDayFixtures.longBlockWithShortOverlaps),
    editingEndeavorId: planEditSessionFixture.endeavorId,
  }

  it('shows two handles and an outline on the armed card, and on no other', () => {
    mount(editing)

    expect(screen.getAllByTestId('plan-timeline-edit-handle')).toHaveLength(2)
    expect(screen.getAllByTestId('plan-timeline-edit-outline')).toHaveLength(1)
  })

  it('raises the armed card above its neighbours so the dots are never occluded', () => {
    mount(editing)

    const armed = screen
      .getAllByTestId('plan-timeline-block')
      .find((block) => block.dataset.editing === 'true')
    const other = screen
      .getAllByTestId('plan-timeline-block')
      .find((block) => block.dataset.editing === 'false')
    expect(Number(armed?.style.zIndex)).toBeGreaterThan(Number(other?.style.zIndex))
  })

  it('disables the scroll container, or the drag would be stolen by it', () => {
    mount(editing)

    expect(screen.getByTestId('plan-timeline-scroll').style.overflowY).toBe(
      'hidden',
    )
  })

  it('stands the slot layer down entirely while a card is armed', () => {
    mount(editing)

    expect(screen.queryByTestId('plan-timeline-slots')).toBeNull()
  })

  it('reports a top-handle drag as a start grab with a CUMULATIVE translation', () => {
    const onGrabHandle = vi.fn()
    const onDragHandle = vi.fn()
    const onReleaseHandle = vi.fn()
    mount({ ...editing, onGrabHandle, onDragHandle, onReleaseHandle })

    const handle = screen
      .getAllByTestId('plan-timeline-edit-handle')
      .find((dot) => dot.dataset.edge === 'start') as HTMLElement

    pointer('pointerDown', handle, { clientX: 0, clientY: 200 })
    pointer('pointerMove', handle, { clientX: 0, clientY: 215 })
    pointer('pointerMove', handle, { clientX: 0, clientY: 245 })
    pointer('pointerUp', handle, { clientX: 0, clientY: 245 })

    expect(onGrabHandle).toHaveBeenCalledWith(TimelineDragHandle.start)
    expect(onDragHandle).toHaveBeenNthCalledWith(1, 15)
    expect(onDragHandle).toHaveBeenNthCalledWith(2, 45)
    expect(onReleaseHandle).toHaveBeenCalledTimes(1)
  })

  it('reports a bottom-handle drag as an end grab', () => {
    const onGrabHandle = vi.fn()
    mount({ ...editing, onGrabHandle })

    const handle = screen
      .getAllByTestId('plan-timeline-edit-handle')
      .find((dot) => dot.dataset.edge === 'end') as HTMLElement
    pointer('pointerDown', handle, { clientX: 0, clientY: 300 })

    expect(onGrabHandle).toHaveBeenCalledWith(TimelineDragHandle.end)
  })

  it('reports a body drag only after canon 4px, so a tap is not stolen', () => {
    const onGrabHandle = vi.fn()
    const onDragHandle = vi.fn()
    mount({ ...editing, onGrabHandle, onDragHandle })

    const armed = screen
      .getAllByTestId('plan-timeline-block')
      .find((block) => block.dataset.editing === 'true') as HTMLElement
    const surface = armed.querySelector(
      '[data-testid="plan-timeline-block-surface"]',
    ) as HTMLElement

    pointer('pointerDown', surface, { clientX: 100, clientY: 100 })
    pointer('pointerMove', surface, { clientX: 100, clientY: 102 })
    expect(onGrabHandle).not.toHaveBeenCalled()

    pointer('pointerMove', surface, { clientX: 100, clientY: 130 })
    expect(onGrabHandle).toHaveBeenCalledWith(TimelineDragHandle.body)
    expect(onDragHandle).toHaveBeenCalledWith(30)
  })

  it('moves an edge one snap grain per arrow key — the keyboard path is the same three calls', async () => {
    const onGrabHandle = vi.fn()
    const onDragHandle = vi.fn()
    const onReleaseHandle = vi.fn()
    mount({ ...editing, onGrabHandle, onDragHandle, onReleaseHandle })

    const handle = screen
      .getAllByTestId('plan-timeline-edit-handle')
      .find((dot) => dot.dataset.edge === 'end') as HTMLElement
    handle.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(onGrabHandle).toHaveBeenCalledWith(TimelineDragHandle.end)
    expect(onDragHandle).toHaveBeenCalledWith(HANDLE_KEYBOARD_STEP_PX)
    expect(onReleaseHandle).toHaveBeenCalledTimes(1)
    expect(HANDLE_KEYBOARD_STEP_PX).toBe(15)
  })

  it('commits when the canvas outside the card is used', async () => {
    const onTapOutsideEditing = vi.fn()
    mount({ ...editing, onTapOutsideEditing })

    await userEvent.click(screen.getByTestId('plan-timeline-commit-surface'))

    expect(onTapOutsideEditing).toHaveBeenCalledTimes(1)
  })

  it('commits when ANOTHER card is tapped, and does not open its detail', () => {
    const onTapOutsideEditing = vi.fn()
    const onViewDetail = vi.fn()
    mount({ ...editing, onTapOutsideEditing, onViewDetail })

    const other = screen
      .getAllByTestId('plan-timeline-block')
      .find((block) => block.dataset.endeavorId === 'nested-short-a') as HTMLElement
    const surface = other.querySelector(
      '[data-testid="plan-timeline-block-surface"]',
    ) as HTMLElement

    pointer('pointerDown', surface, { clientX: 10, clientY: 10 })
    pointer('pointerUp', surface, { clientX: 10, clientY: 10 })

    expect(onTapOutsideEditing).toHaveBeenCalledTimes(1)
    expect(onViewDetail).not.toHaveBeenCalled()
  })

  it('keeps the armed card armed when it is tapped itself', () => {
    const onTapOutsideEditing = vi.fn()
    mount({ ...editing, onTapOutsideEditing })

    const armed = screen
      .getAllByTestId('plan-timeline-block')
      .find((block) => block.dataset.editing === 'true') as HTMLElement
    const surface = armed.querySelector(
      '[data-testid="plan-timeline-block-surface"]',
    ) as HTMLElement

    pointer('pointerDown', surface, { clientX: 10, clientY: 10 })
    pointer('pointerUp', surface, { clientX: 10, clientY: 10 })

    expect(onTapOutsideEditing).not.toHaveBeenCalled()
  })
})

// --------------------------------------------------------------- quick create

describe('quick create', () => {
  it('covers the whole band with quarter-hour press targets', () => {
    mount()

    expect(screen.getByTestId('plan-timeline-slots').children).toHaveLength(96)
  })

  it('creates at the pressed slot after canon 0.3s hold, flagged as a hold', () => {
    const onPressSlot = vi.fn()
    mount({ onPressSlot })

    const slots = screen.getByTestId('plan-timeline-slots')
    const slot = slots.children[36] as HTMLElement
    pointer('pointerDown', slot, { clientX: 100, clientY: 500 })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onPressSlot).toHaveBeenCalledWith(36, true)
  })

  it('creates at the same slot on a double tap, flagged as NOT a hold', () => {
    const onPressSlot = vi.fn()
    mount({ onPressSlot })

    const slot = screen.getByTestId('plan-timeline-slots').children[36] as HTMLElement
    pointer('pointerDown', slot, { clientX: 100, clientY: 500 })
    pointer('pointerUp', slot, { clientX: 100, clientY: 500 })
    act(() => {
      vi.advanceTimersByTime(80)
    })
    pointer('pointerDown', slot, { clientX: 100, clientY: 500 })
    pointer('pointerUp', slot, { clientX: 100, clientY: 500 })

    expect(onPressSlot).toHaveBeenCalledTimes(1)
    expect(onPressSlot).toHaveBeenCalledWith(36, false)
  })

  it('exposes only the on-the-hour slots to assistive technology', () => {
    mount()

    const slots = Array.from(screen.getByTestId('plan-timeline-slots').children)
    const reachable = slots.filter((slot) => slot.getAttribute('tabindex') === '0')
    expect(reachable).toHaveLength(24)
    expect(reachable[9]?.getAttribute('aria-label')).toBe('Add event at 9:00 AM')
  })

  it('draws the dashed hour ghost where the prompt is seeding an event', () => {
    mount({ quickCreate: { start: planAt(14), durationSeconds: 3600 } })

    const ghost = screen.getByTestId('plan-timeline-draft')
    expect(ghost.style.top).toBe(`${14 * TIMELINE_HOUR_HEIGHT_PX}px`)
    expect(ghost.style.height).toBe(`${TIMELINE_HOUR_HEIGHT_PX}px`)
    expect(ghost.style.border).toContain('dashed')
  })

  it('draws no ghost for a draft seeded on another day', () => {
    mount({
      quickCreate: {
        start: new Date(planAt(14).getTime() + 86_400_000),
        durationSeconds: 3600,
      },
    })

    expect(screen.queryByTestId('plan-timeline-draft')).toBeNull()
  })

  it('lays out no press targets at all when the flag is off', () => {
    mount({ isQuickCreateAvailable: false })

    expect(screen.queryByTestId('plan-timeline-slots')).toBeNull()
  })
})

// -------------------------------------------------------------- the now line

describe('the now line', () => {
  it('is drawn at the injected clock position when the day is today', () => {
    mount()

    // 09:40 → 9.6667 hours × 60px.
    expect(screen.getByTestId('plan-timeline-now').style.top).toBe('580px')
  })

  it('is absent on any other day, where "now" means nothing', () => {
    mount({ isShowingToday: false })

    expect(screen.queryByTestId('plan-timeline-now')).toBeNull()
  })

  it('subtracts the band offset, so a business-hours day places it correctly', () => {
    mount({
      band: BUSINESS_BAND,
      isShowingToday: true,
      slotCount: timelineSlotCount(BUSINESS_BAND),
      placements: placementsFor(planDayFixtures.longSoloBlock, BUSINESS_BAND),
    })

    expect(screen.getByTestId('plan-timeline-now').style.top).toBe('100px')
  })
})
