/**
 * The Inbox's render tests, mirroring `InboxFragment.stories` (`RC-11`).
 *
 * Acceptance criteria 2 and 3 are read here: the sheet-on-mobile /
 * popover-on-desktop split with canon's frame and its two sections, and the
 * pinned header over a centred tray when there is nothing to triage.
 */
import { EndeavorOperation, EndeavorsVistas } from '@kro/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endeavorCardModelFrom } from '../../../../design/endeavor/endeavorCardModel'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { PRESENTATION_SIZE } from '../../../main/MainPresentation'
import { CAPTURE_MOCK_NOW, captureEndeavorFixtures } from '../../CaptureMocks'
import { nextQuarterHourSlot } from '../../CaptureRules'
import { InboxFragment, type InboxFragmentProps } from '../InboxFragment'
import { installCaptureEnvironment } from './captureHarness'

let teardownRadix: () => void
let teardownCapture: () => void

beforeEach(() => {
  teardownRadix = installRadixEnvironment()
  teardownCapture = installCaptureEnvironment()
})

afterEach(() => {
  cleanup()
  teardownRadix()
  teardownCapture()
})

const noop = () => {}

const justCreated = endeavorCardModelFrom(
  captureEndeavorFixtures.freshTask,
  CAPTURE_MOCK_NOW,
)
const pending = [
  endeavorCardModelFrom(
    captureEndeavorFixtures.unscheduledReminder,
    CAPTURE_MOCK_NOW,
  ),
  endeavorCardModelFrom(
    captureEndeavorFixtures.unscheduledHabit,
    CAPTURE_MOCK_NOW,
  ),
]

const renderInbox = (overrides: Partial<InboxFragmentProps> = {}) =>
  render(
    <InboxFragment
      isOpen
      presentation="sheet"
      justCreated={justCreated}
      pendingTriage={pending}
      totalCount={1 + pending.length}
      isEmpty={false}
      capabilities={EndeavorsVistas.inbox.capabilities}
      rowLayout="comfortable"
      addForToday={null}
      now={CAPTURE_MOCK_NOW}
      locale="en-US"
      input="touch"
      onDismiss={noop}
      onTapTriage={noop}
      onRequestAddForToday={noop}
      onAdjustAddForTodayTime={noop}
      onCancelAddForToday={noop}
      onConfirmAddForToday={noop}
      onOperation={noop}
      {...overrides}
    />,
  )

describe('sheet on mobile, popover on desktop (acceptance criterion 2)', () => {
  it('sheets it from the bottom edge on a phone', () => {
    renderInbox()

    expect(
      screen.getByTestId('inbox-surface').getAttribute('data-kro-presentation'),
    ).toBe('sheet')
  })

  it('pops it over the content at canon\'s 560 x 620 on a desktop', () => {
    renderInbox({ presentation: 'popover', rowLayout: 'compactDesktop' })

    const panel = screen.getByTestId('inbox-surface')
    expect(panel.getAttribute('data-kro-presentation')).toBe('popover')
    expect(panel.style.width).toBe(`${PRESENTATION_SIZE.inbox.width}px`)
    expect(panel.style.height).toBe(`${PRESENTATION_SIZE.inbox.height}px`)
  })

  it('renders inline for the Jot Down destination, with nothing to dismiss', () => {
    renderInbox({ presentation: 'inline' })

    expect(
      screen.getByTestId('inbox-surface').getAttribute('data-kro-presentation'),
    ).toBe('inline')
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
  })

  it('renders nothing at all while the overlay is closed', () => {
    renderInbox({ isOpen: false })

    expect(screen.queryByTestId('inbox-surface')).toBeNull()
  })
})

describe('the two sections', () => {
  it('puts the freshly captured row in Just Created and the rest in Pending Triage', () => {
    renderInbox()

    const created = screen.getByTestId('inbox-section-just-created')
    expect(within(created).getByText('Draft the announcement')).toBeTruthy()

    const triage = screen.getByTestId('inbox-section-pending-triage')
    expect(within(triage).getByText('Bring the parcel in')).toBeTruthy()
    expect(within(triage).getByText('Stretch for five minutes')).toBeTruthy()
  })

  it('drops the Just Created section entirely once the slot has drained', () => {
    renderInbox({ justCreated: null, totalCount: pending.length })

    expect(screen.queryByTestId('inbox-section-just-created')).toBeNull()
    expect(screen.getByTestId('inbox-section-pending-triage')).toBeTruthy()
  })

  it('counts the rows in the header, as canon\'s subtitle does', () => {
    renderInbox({ presentation: 'inline' })

    // The overlay presentations also announce the count through the dialog's
    // hidden description, so the inline one is where a single visible node is
    // the assertion rather than an ambiguity.
    expect(screen.getByText('3 endeavors')).toBeTruthy()
  })

  it('gives every row canon\'s two explicit buttons, which are not swipe bindings', () => {
    renderInbox()

    expect(
      screen.getByRole('button', { name: 'Triage Draft the announcement' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Add Draft the announcement for today' }),
    ).toBeTruthy()
  })
})

describe('the empty tray (acceptance criterion 3)', () => {
  it('pins the header and centres the tray illustration', () => {
    renderInbox({
      presentation: 'inline',
      justCreated: null,
      pendingTriage: [],
      totalCount: 0,
      isEmpty: true,
    })

    const surface = screen.getByTestId('inbox-surface')
    const header = within(surface).getByText('Inbox')
    const tray = within(surface).getByText('Inbox is empty')

    // Pinned above, centred below: the header precedes the illustration in the
    // document, which is canon's `VStack { header; emptyState }`.
    expect(header.compareDocumentPosition(tray)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(
      within(surface).getByText('Recently added endeavors will appear here'),
    ).toBeTruthy()
  })

  it('says nothing about a count when there is nothing to count', () => {
    renderInbox({
      justCreated: null,
      pendingTriage: [],
      totalCount: 0,
      isEmpty: true,
    })

    expect(screen.queryByText(/endeavors$/)).toBeNull()
  })

  it('shows no sections at all rather than two empty ones', () => {
    renderInbox({
      justCreated: null,
      pendingTriage: [],
      totalCount: 0,
      isEmpty: true,
    })

    expect(screen.queryByTestId('inbox-section-just-created')).toBeNull()
    expect(screen.queryByTestId('inbox-section-pending-triage')).toBeNull()
  })
})

describe('Add for Today', () => {
  it('stays shut until its row asks for it', () => {
    renderInbox()

    expect(screen.queryByTestId('add-for-today-confirm')).toBeNull()
  })

  it('raises the request rather than opening itself — the slice owns the prefill', async () => {
    const onRequestAddForToday = vi.fn()
    renderInbox({ onRequestAddForToday })

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Draft the announcement for today' }),
    )

    expect(onRequestAddForToday).toHaveBeenCalledWith(justCreated.id)
  })

  it('opens pre-filled with the next quarter hour, so one tap confirms', () => {
    renderInbox({
      addForToday: {
        endeavorId: justCreated.id,
        pickedTime: nextQuarterHourSlot(CAPTURE_MOCK_NOW),
      },
    })

    expect(screen.getByTestId('add-for-today-confirm')).toBeTruthy()
    // 10:07 rounds UP to 10:15, never to the 10:00 the prompt's own seed uses.
    expect(
      screen.getByTestId<HTMLInputElement>('add-for-today-time').value,
    ).toBe('10:15')
  })

  it('opens on exactly the row that asked, never on its neighbour', () => {
    renderInbox({
      addForToday: {
        endeavorId: justCreated.id,
        pickedTime: nextQuarterHourSlot(CAPTURE_MOCK_NOW),
      },
    })

    const created = screen.getByTestId('inbox-section-just-created')
    expect(within(created).getByTestId('add-for-today-confirm')).toBeTruthy()
    const triage = screen.getByTestId('inbox-section-pending-triage')
    expect(within(triage).queryByTestId('add-for-today-confirm')).toBeNull()
  })

  it('confirms and cancels through callbacks, never by mutating anything itself', async () => {
    const onConfirmAddForToday = vi.fn()
    const onCancelAddForToday = vi.fn()
    renderInbox({
      addForToday: {
        endeavorId: justCreated.id,
        pickedTime: nextQuarterHourSlot(CAPTURE_MOCK_NOW),
      },
      onConfirmAddForToday,
      onCancelAddForToday,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    expect(onConfirmAddForToday).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancelAddForToday).toHaveBeenCalledTimes(1)
  })
})

describe('the row operations come from the vista, not from this file', () => {
  it('reveals the trailing swipe bindings on touch, and nothing on the leading edge', () => {
    renderInbox()

    // `EndeavorsVistas.inbox` declares markComplete and delete on the trailing
    // swipe and nothing on the leading one; the surface renders exactly those,
    // labelled with the vista's own strings.
    const created = screen.getByTestId('inbox-section-just-created')
    const trailing = created.querySelector('[data-slot="endeavor-swipe-trailing"]')
    expect(trailing).not.toBeNull()
    expect(
      [...(trailing?.querySelectorAll('button') ?? [])].map((button) =>
        button.getAttribute('aria-label'),
      ),
    ).toEqual(['Complete', 'Delete'])
    expect(
      created.querySelector('[data-slot="endeavor-swipe-leading"]'),
    ).toBeNull()
  })

  it('raises an operation with the row it belongs to', async () => {
    const onOperation = vi.fn()
    renderInbox({ onOperation })

    const created = screen.getByTestId('inbox-section-just-created')
    // The revealed panel is `aria-hidden` until the swipe uncovers it, so it is
    // reached by slot rather than by role — the gesture itself belongs to the
    // kit's own suite, and what matters here is which row the intent carries.
    const complete = created.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-swipe-trailing"] button[aria-label="Complete"]',
    )
    complete?.click()

    expect(onOperation).toHaveBeenCalledWith(
      EndeavorOperation.markComplete,
      justCreated.id,
    )
  })

  it('raises the Triage intent and stops there — the carousel is #26\'s', async () => {
    const onTapTriage = vi.fn()
    renderInbox({ onTapTriage })

    await userEvent.click(
      screen.getByRole('button', { name: 'Triage Draft the announcement' }),
    )

    expect(onTapTriage).toHaveBeenCalledWith(justCreated.id)
  })
})
