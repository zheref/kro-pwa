/**
 * Find, mounted on a real store (`RC-11`).
 *
 * Every scene seeds the in-memory database and lets the surface's own fetch
 * run, so what is drawn is what the Producer, the Shifter and the reconcile
 * pass actually produce — see `__tests__/pagesHarness.tsx` for why that is the
 * stronger claim than a preloaded slice.
 */
import { Stage } from '../../../design/endeavor/storyStage'
import { allFindEndeavorMocks, findEndeavorMocks } from '../FindMocks'
import { FindPage } from './FindPage'
import {
  Harness,
  detailEnabledFlags,
  makeSeededStore,
} from './__tests__/pagesHarness'

export default {
  title: 'Find/Find page',
  component: FindPage,
  parameters: { layout: 'fullscreen' },
}

/** The seeded, mixed list — the story the screenshots are taken from. */
export const Loaded = {
  render: () => (
    <Stage width={430}>
      <Harness store={makeSeededStore({ endeavors: allFindEndeavorMocks })}>
        <FindPage input="touch" locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** A pointer surface with the dark-launched Detail tap resolved on. */
export const PointerWithDetailEnabled = {
  render: () => (
    <Stage width={900}>
      <Harness
        store={makeSeededStore({
          endeavors: allFindEndeavorMocks,
          featureFlags: detailEnabledFlags,
        })}
      >
        <FindPage input="pointer" locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** A first run: the database is empty, so canon's "No Endeavors Yet" shows. */
export const FirstRun = {
  render: () => (
    <Stage width={430}>
      <Harness store={makeSeededStore()}>
        <FindPage input="touch" locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** One endeavor, to judge the row's own geometry rather than the list's. */
export const SingleRow = {
  render: () => (
    <Stage width={430}>
      <Harness
        store={makeSeededStore({ endeavors: [findEndeavorMocks.teamSync] })}
      >
        <FindPage input="touch" locale="en-US" />
      </Harness>
    </Stage>
  ),
}
