/**
 * The one Service read the two browsing surfaces need before they can install a
 * vista: which feature flags are enabled (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * ## Why this exists at all
 *
 * `#29`'s `onViewLoaded` takes `enabledFlags` as an argument — deliberately, so
 * capability gating stays a pure Selector read and no Selector ever reaches for
 * a flag service. That leaves somebody to *supply* the list, and a Page cannot:
 * a Service reaches a Producer through `extra` and nowhere else (`RC-6`). So
 * this is that Producer. It reads `extra.featureFlags`, hands back the enabled
 * names, and the Page dispatches the plain `onViewLoaded` event with them —
 * the same "resolve through a Producer, then dispatch a named event" shape
 * `MainShellPage` already uses for the capture route hand-off.
 *
 * ## No reducer arm, on purpose
 *
 * Nothing in `findSlice` handles this thunk's three lifecycle actions, because
 * there is nothing for them to change: the value's only consumer is the
 * `onViewLoaded` payload the Page assembles from it. Adding arms would put the
 * flag list in `State` twice — once here and once inside the surface it was
 * installed on — and the second copy is the one that goes stale.
 *
 * ## A flag read that fails resolves to "nothing enabled"
 *
 * A capability whose flag cannot be resolved is simply not offered, which is
 * the safe direction: the surface renders without the dark-launched gesture
 * rather than refusing to render. That mirrors `restoreFindLensThunk`'s own
 * rule — a preference that cannot be read is not a reason to show an error over
 * a screen that works.
 */
import {
  FeatureFlags,
  type Result,
  ok,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../../library/store'
import type { FindException } from '../FindException'

/**
 * The flags a vista binding can wait on.
 *
 * One entry today — `endeavorDetail`, the flag every `viewDetail` tap binding
 * in the registry declares. It is a list rather than a single boolean because
 * `EndeavorCapabilities.requires` is a flag *name*, so a second gated binding
 * needs a row here and nothing else.
 */
export const CAPABILITY_FLAGS = [FeatureFlags.endeavorDetail] as const

/**
 * The names of the capability flags that are currently enabled.
 *
 * Exactly the shape `FindState.enabledFlags` holds and
 * `selectFindCapabilities` tests membership against.
 */
export const resolveCapabilityFlagsThunk = createAsyncThunk<
  Result<readonly string[], FindException>,
  void,
  { extra: ThunkExtra }
>('find/onCapabilityFlagsResolved', async (_unused, { extra }) => {
  try {
    return ok(
      CAPABILITY_FLAGS.filter((flag) => extra.featureFlags.isEnabled(flag)).map(
        (flag) => flag.name,
      ),
    )
  } catch {
    // See the header: an unreadable flag hides its capability, it never breaks
    // the surface that was going to offer it.
    return ok([])
  }
})
