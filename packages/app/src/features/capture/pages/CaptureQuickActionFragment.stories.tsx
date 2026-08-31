/**
 * The default quick-action disc, and the destinations it stands down for.
 *
 * `CaptureQuickActionFragment.test.tsx` mirrors this set (`RC-11`).
 */

import { DestinationKind } from '../../main/SidebarDestination'
import {
  CaptureQuickActionFragment,
  captureQuickActionShows,
} from './CaptureQuickActionFragment'
import { ThemeScope } from './__tests__/captureHarness'

export default {
  title: 'Capture/Quick action',
  component: CaptureQuickActionFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

/** On a destination whose own child owns no FAB — canon's `default:` branch. */
export const Visible = {
  render: () => (
    <ThemeScope theme="light">
      <CaptureQuickActionFragment
        isVisible={captureQuickActionShows({ kind: DestinationKind.allTasks })}
        onPress={noop}
      />
    </ThemeScope>
  ),
}

/** The same disc in the dark scheme. */
export const Dark = {
  render: () => (
    <ThemeScope theme="dark">
      <CaptureQuickActionFragment isVisible onPress={noop} />
    </ThemeScope>
  ),
}

/** Plan owns its own unfurling menu (KC-IS-#19), so this one stands down. */
export const HiddenOnPlan = {
  render: () => (
    <ThemeScope theme="light">
      <CaptureQuickActionFragment
        isVisible={captureQuickActionShows({ kind: DestinationKind.plan })}
        onPress={noop}
      />
    </ThemeScope>
  ),
}

/** Search hides it outright — canon's `isQuickActionAvailable`. */
export const HiddenOnSearch = {
  render: () => (
    <ThemeScope theme="light">
      <CaptureQuickActionFragment
        isVisible={captureQuickActionShows({ kind: DestinationKind.search })}
        onPress={noop}
      />
    </ThemeScope>
  ),
}
