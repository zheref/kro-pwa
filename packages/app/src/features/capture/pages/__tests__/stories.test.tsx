/**
 * Snapshots of the Capture surfaces' Storybook stories (UZF-26, RC-11).
 *
 * The same arrangement as `features/triage/pages/__tests__/stories.test.tsx`:
 * the Storybook test-runner needs a server and a browser that `make test`
 * starts neither of, so these run the stories themselves under Vitest, inside
 * the gate every commit passes. THE SUBJECT IS THE STORY — never a lookalike
 * re-typed here.
 *
 * The prompt and the Inbox are Radix dialogs, which portal to `document.body`,
 * so the snapshot is the body, not the render container: a container snapshot
 * would record an empty stage and assert nothing. Page stories load their
 * store through the real Producers, so the sweep settles the microtask queue
 * before it snapshots.
 *
 * What a snapshot proves: markup, class composition and token wiring are
 * stable. It proves nothing about paint — the glass, the motion — which the
 * PR's screenshots cover.
 */
import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import * as promptStories from '../CapturePromptFragment.stories'
import * as promptPageStories from '../CapturePromptPage.stories'
import * as quickActionStories from '../CaptureQuickActionFragment.stories'
import * as quickActionPageStories from '../CaptureQuickActionPage.stories'
import * as suggestionsStories from '../CaptureSuggestionsFragment.stories'
import * as inboxDestinationStories from '../InboxDestinationPage.stories'
import * as inboxStories from '../InboxFragment.stories'
import * as inboxOverlayStories from '../InboxOverlayPage.stories'
import { installCaptureEnvironment } from './captureHarness'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['CapturePromptFragment', promptStories],
  ['CapturePromptPage', promptPageStories],
  ['CaptureSuggestionsFragment', suggestionsStories],
  ['CaptureQuickActionFragment', quickActionStories],
  ['CaptureQuickActionPage', quickActionPageStories],
  ['InboxFragment', inboxStories],
  ['InboxOverlayPage', inboxOverlayStories],
  ['InboxDestinationPage', inboxDestinationStories],
]

function storiesOf(module: StoryModule): Array<[string, Story]> {
  return Object.entries(module).filter(
    (entry): entry is [string, Story] =>
      entry[0] !== 'default' &&
      typeof entry[1] === 'object' &&
      entry[1] !== null &&
      typeof (entry[1] as Story).render === 'function',
  )
}

/** Let each store's async chain land — context load, flags, the route. */
async function settle(): Promise<void> {
  for (let round = 0; round < 6; round += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

/** Radix and React mint ids per mount — normalise them out of the markup. */
function normalise(markup: string): string {
  return markup.replace(/(radix-)?[«:][a-zA-Z0-9]+[»:]/g, '$1<id>')
}

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

describe('every Capture surface ships at least three stories', () => {
  for (const [surface, module] of MODULES) {
    it(`${surface} has 3 or more`, () => {
      expect(storiesOf(module).length).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('story snapshots', () => {
  for (const [surface, module] of MODULES) {
    describe(surface, () => {
      for (const [exportName, story] of storiesOf(module)) {
        it(exportName, async () => {
          render(story.render())
          await settle()
          expect(normalise(document.body.innerHTML)).toMatchSnapshot()
        })
      }
    })
  }
})
