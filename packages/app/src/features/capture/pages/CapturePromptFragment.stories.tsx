/**
 * The capture prompt, at both widths, in both schemes, in the states its
 * validation table can produce.
 *
 * Every draft comes from `CaptureMocks` — the validation truth table, one row
 * each — and every disabled Add's reason comes from the same
 * `captureBlockedReason` the Page reads, so a story cannot show a prompt the
 * slice could not produce (`RC-31`). `CapturePromptFragment.test.tsx` mirrors
 * this set one for one (`RC-11`).
 */

import { ThemeScope } from './__tests__/captureHarness'
import { captureDraftFixtures, CAPTURE_MOCK_NOW } from '../CaptureMocks'
import {
  CaptureDestination,
  type CaptureDraft,
  canSubmitCapture,
  captureBlockedReason,
} from '../CaptureRules'
import {
  CapturePromptFragment,
  type CapturePromptFragmentProps,
} from './CapturePromptFragment'
import type { CapturePresentationKind } from './capturePresentation'

export default {
  title: 'Capture/Prompt',
  component: CapturePromptFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

const prompt = (
  draft: CaptureDraft,
  presentation: CapturePresentationKind,
  overrides: Partial<CapturePromptFragmentProps> = {},
) => (
  <CapturePromptFragment
    isOpen
    draft={draft}
    isEditingStartTime={false}
    isEditingEndTime={false}
    availableDestinations={[
      CaptureDestination.local,
      CaptureDestination.kroCloud,
    ]}
    canSubmit={canSubmitCapture(draft)}
    blockedReason={captureBlockedReason(draft)}
    presentation={presentation}
    now={CAPTURE_MOCK_NOW}
    locale="en-US"
    onEditTitle={noop}
    onSelectKind={noop}
    onPickDate={noop}
    onClearDate={noop}
    onBeginTimeEdit={noop}
    onPickTime={noop}
    onEndTimeEdit={noop}
    onPickRewards={noop}
    onPickRecurrence={noop}
    onSelectDestination={noop}
    onDiscard={noop}
    onSubmit={noop}
    {...overrides}
  />
)

/** A fresh Task prompt on a phone: untitled, so Add names what it wants. */
export const SheetEmptyTask = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.emptyTask, 'sheet')}
    </ThemeScope>
  ),
}

/** The same prompt with a title typed — Add enabled, no reason shown. */
export const SheetReadyToSubmit = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.titledTask, 'sheet')}
    </ThemeScope>
  ),
}

/** An Event with neither time: canon's one stricter kind, blocked on both. */
export const SheetEventMissingTimes = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.eventMissingBothTimes, 'sheet')}
    </ThemeScope>
  ),
}

/** The same phone sheet in the dark scheme. */
export const SheetDark = {
  render: () => (
    <ThemeScope theme="dark">
      {prompt(captureDraftFixtures.emptyTask, 'sheet')}
    </ThemeScope>
  ),
}

/** The desktop glass popover, anchored to the FAB's own corner. */
export const PopoverEmptyTask = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.emptyTask, 'popover')}
    </ThemeScope>
  ),
}

/** The popover with an event blocked on its end time only. */
export const PopoverEventMissingEnd = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.eventMissingEnd, 'popover')}
    </ThemeScope>
  ),
}

/** The desktop popover in the dark scheme. */
export const PopoverDark = {
  render: () => (
    <ThemeScope theme="dark">
      {prompt(captureDraftFixtures.titledTask, 'popover')}
    </ThemeScope>
  ),
}

/** The start-time panel expanded — canon's Discard / Clear / Done bar. */
export const TimePanelOpen = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.timedTask, 'sheet', {
        isEditingStartTime: true,
      })}
    </ThemeScope>
  ),
}

/** A Habit: no date chip at all, and rewards still on offer. */
export const HabitHasNoDate = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.titledHabit, 'sheet')}
    </ThemeScope>
  ),
}

/**
 * A Task with its date cleared — the `KC-IS-#75` fix. The chip reads "No
 * date" and its Clear button is gone; Add stays enabled, so this is exactly
 * what submits a Task into Pending Triage.
 */
export const SheetTaskDateCleared = {
  render: () => (
    <ThemeScope theme="light">
      {prompt(captureDraftFixtures.titledTaskNoDate, 'sheet')}
    </ThemeScope>
  ),
}
