/**
 * The Inbox in all three presentations, both row layouts, both schemes, and the
 * three states canon's own previews cover: mixed, pending-only, empty.
 *
 * Every row is built from `captureEndeavorFixtures` through the same
 * `endeavorCardModelFrom` seam the Page uses, and the row operations come from
 * the shipped `EndeavorsVistas.inbox` — so a story cannot show a capability the
 * vista does not declare (`RC-31`). `InboxFragment.test.tsx` mirrors this set
 * (`RC-11`).
 */

import { EndeavorsVistas } from '@kro/core'
import { endeavorCardModelFrom } from '../../../design/endeavor/endeavorCardModel'
import { CAPTURE_MOCK_NOW, captureEndeavorFixtures } from '../CaptureMocks'
import { nextQuarterHourSlot } from '../CaptureRules'
import { InboxFragment, type InboxFragmentProps } from './InboxFragment'
import { ThemeScope } from './__tests__/captureHarness'

export default {
  title: 'Capture/Inbox',
  component: InboxFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

const card = (endeavor: Parameters<typeof endeavorCardModelFrom>[0]) =>
  endeavorCardModelFrom(endeavor, CAPTURE_MOCK_NOW)

const justCreated = card(captureEndeavorFixtures.freshTask)
const pending = [
  card(captureEndeavorFixtures.unscheduledReminder),
  card(captureEndeavorFixtures.unscheduledHabit),
  card(captureEndeavorFixtures.neglectedTask),
]

const inbox = (overrides: Partial<InboxFragmentProps> = {}) => (
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
  />
)

/** Canon's "Just Created + Pending Triage" preview, on a phone sheet. */
export const SheetBothSections = {
  render: () => <ThemeScope theme="light">{inbox()}</ThemeScope>,
}

/** Canon's "Pending Triage only" — the slot fires once per capture, then drains. */
export const SheetPendingOnly = {
  render: () => (
    <ThemeScope theme="light">
      {inbox({ justCreated: null, totalCount: pending.length })}
    </ThemeScope>
  ),
}

/** The pinned header over a centred tray — acceptance criterion 3. */
export const SheetEmptyTray = {
  render: () => (
    <ThemeScope theme="light">
      {inbox({
        justCreated: null,
        pendingTriage: [],
        totalCount: 0,
        isEmpty: true,
      })}
    </ThemeScope>
  ),
}

/** The phone sheet in the dark scheme. */
export const SheetDark = {
  render: () => <ThemeScope theme="dark">{inbox()}</ThemeScope>,
}

/** Canon's macOS popover: 560 x 620, compact rows, hover operations. */
export const PopoverBothSections = {
  render: () => (
    <ThemeScope theme="light">
      {inbox({
        presentation: 'popover',
        rowLayout: 'compactDesktop',
        input: 'pointer',
      })}
    </ThemeScope>
  ),
}

/** The desktop popover with nothing to triage. */
export const PopoverEmptyTray = {
  render: () => (
    <ThemeScope theme="light">
      {inbox({
        presentation: 'popover',
        rowLayout: 'compactDesktop',
        input: 'pointer',
        justCreated: null,
        pendingTriage: [],
        totalCount: 0,
        isEmpty: true,
      })}
    </ThemeScope>
  ),
}

/** The desktop popover in the dark scheme. */
export const PopoverDark = {
  render: () => (
    <ThemeScope theme="dark">
      {inbox({
        presentation: 'popover',
        rowLayout: 'compactDesktop',
        input: 'pointer',
      })}
    </ThemeScope>
  ),
}

/** The Add-for-Today confirm, pre-filled with the next quarter hour. */
export const AddForTodayOpen = {
  render: () => (
    <ThemeScope theme="light">
      {inbox({
        addForToday: {
          endeavorId: justCreated.id,
          pickedTime: nextQuarterHourSlot(CAPTURE_MOCK_NOW),
        },
      })}
    </ThemeScope>
  ),
}

/** The `/inbox` destination: no dialog, no dismiss — a page is navigated away from. */
export const DestinationPageInline = {
  render: () => (
    <ThemeScope theme="light">
      <div style={{ height: 620 }}>
        {inbox({ presentation: 'inline', rowLayout: 'compactDesktop', input: 'pointer' })}
      </div>
    </ThemeScope>
  ),
}
