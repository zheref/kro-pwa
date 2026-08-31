/**
 * The Triage form in every state canon's own `#Preview` set covers, plus the
 * three this port adds: the value-promotion highlight (acceptance criterion 2),
 * the Custom expiry pill in selected-first order, and the two save outcomes the
 * durable write can land on.
 *
 * Every story's props come from `triageFormProps`, which runs the **real**
 * Selectors over a `TriageMocks` / `triagePageStateMocks` state — so a story
 * cannot show a chip order, a blocked reason or a secondary button the shipped
 * logic would not produce (`RC-31`). `__tests__/TriageFormFragment.test.tsx`
 * mirrors this set 1:1 (`RC-11`).
 */

import { triageStateMocks } from '../TriageMocks'
import { TriageFormFragment } from './TriageFormFragment'
import {
  ThemeScope,
  triageFormProps,
  triagePageStateMocks,
} from './__tests__/triageHarness'

export default {
  title: 'Triage/Form',
  component: TriageFormFragment,
  parameters: { layout: 'fullscreen' },
}

const form = (
  slice: Parameters<typeof triageFormProps>[0],
  theme: 'light' | 'dark' = 'light',
) => (
  <ThemeScope theme={theme}>
    <div style={{ height: 720 }}>
      <TriageFormFragment {...triageFormProps(slice)} />
    </div>
  </ThemeScope>
)

/** Canon's "Empty / pristine": nothing picked, Complete disabled and un-tinted. */
export const Pristine = { render: () => form(triageStateMocks.pristine) }

/** The same, dark. */
export const PristineDark = {
  render: () => form(triageStateMocks.pristine, 'dark'),
}

/**
 * Acceptance criterion 2 — four rockets promote the quadrant into the Important
 * row (Schedule), and the gate now names the missing **date** rather than the
 * missing quadrant.
 */
export const ValuePromotesToSchedule = {
  render: () => form(triagePageStateMocks.valuePromotedToSchedule),
}

/** Canon's "Schedule · single CTA": quadrant + seeded date, no secondary. */
export const SchedulePicked = { render: () => form(triageStateMocks.scheduled) }

/** Canon's "Prioritize · Start Now": the green secondary, on a busy morning. */
export const PrioritizeStartNow = {
  render: () => form(triageStateMocks.prioritizedOnBusyDay),
}

/** Canon's "Delegate · Share": the orange secondary. */
export const DelegateShare = {
  render: () => form(triagePageStateMocks.delegatePicked),
}

/** Canon's "Archive · gray secondary" — the one quadrant with no date required. */
export const ArchivePicked = {
  render: () => form(triageStateMocks.archivePicked),
}

/** The bespoke expiry: Custom lit, and first in the row. */
export const CustomExpiry = {
  render: () => form(triagePageStateMocks.customExpiry),
}

/** Canon's "Prioritize · Edit reachable" — the dark-launched bottom row. */
export const EditReachable = {
  render: () => form(triagePageStateMocks.editReachable),
}

/** A push that did not land. The decision is durable; the notice says so. */
export const PushDeferred = {
  render: () => form(triageStateMocks.savedPushDeferred),
}

/** The local save failed — *"the only case the decision truly wasn't captured"*. */
export const SaveFailed = { render: () => form(triageStateMocks.saveFailed) }

/** The Delegate branch, dark, for the contrast pass. */
export const DelegateShareDark = {
  render: () => form(triagePageStateMocks.delegatePicked, 'dark'),
}
