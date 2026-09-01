/**
 * Snapshots of the chrome kit's Storybook stories.
 *
 * Same construction, and the same reasoning, as
 * `design/__tests__/stories.test.tsx`: the subject is THE STORY ITSELF, not a
 * lookalike re-typed here, so a snapshot cannot stay green while the thing
 * people actually look at drifts away from it. It runs under Vitest rather than
 * the Storybook test-runner because `make test` starts no Storybook server and
 * downloads no browser — a regression caught only by a runner nobody runs is a
 * regression caught by nobody.
 *
 * A separate file from the design system's, rather than a few more lines in it,
 * because `#15`'s exclusive file lane is `design/chrome/**` and `#14` is
 * editing that other file for its own set. Two files, no conflict.
 *
 * WHAT A SNAPSHOT HERE IS EVIDENCE OF: the markup, the class composition, the
 * geometry that is applied as an inline value, and the token wiring. What it is
 * NOT evidence of: paint. Blur, the glow's falloff, the mask's cut-out, spring
 * timing and placement are browser answers, and the stories — plus the
 * screenshots in the PR — are where those get judged.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from '../../system/primitives/__tests__/radixEnvironment'
import * as toastStories from '../toast/ActiveToast.stories'
import * as ringsStories from '../rings/ActivityRings.stories'
import * as dialStories from '../dial/DurationDial.stories'
import * as emojiStories from '../emoji/EmojiPicker.stories'
import * as fabStories from '../fab/LiquidGlassFAB.stories'
import * as fabMenuStories from '../fab/LiquidGlassFABMenu.stories'
import * as glowStories from '../glow/RotatingGlow.stories'
import { resetActiveToastSequence } from '../toast/activeToast'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['LiquidGlassFAB', fabStories],
  ['LiquidGlassFABMenu', fabMenuStories],
  ['RotatingGlow', glowStories],
  ['ActiveToast', toastStories],
  ['DurationDial', dialStories],
  ['ActivityRings', ringsStories],
  ['EmojiPicker', emojiStories],
]

/**
 * `EmojiPicker`'s last story mounts a Radix popover trigger, and anything built
 * on Radix's popper costs seconds per mount under jsdom — measured in
 * `system/primitives/__tests__/radixEnvironment.tsx`, where it turned
 * `make test` red. The design system excludes its own Popover and DropdownMenu
 * for the same reason.
 *
 * The story is excluded, not the component: the grid itself is snapshotted by
 * the three stories above it, and the trigger contract is asserted in
 * `EmojiPickerPopover.test.tsx`. The open panel belongs to the Storybook
 * test-runner (`pnpm --filter @kro/web test:storybook`) and to the screenshots
 * in the PR.
 */
const SKIPPED_STORIES = new Set(['EmojiPicker/InPopover'])

function storiesOf(module: StoryModule): Array<[string, Story]> {
  return Object.entries(module)
    .filter(
      (entry): entry is [string, Story] =>
        entry[0] !== 'default' &&
        typeof entry[1] === 'object' &&
        entry[1] !== null &&
        typeof (entry[1] as Story).render === 'function',
    )
    .map(([exportName, story]) => [exportName, story])
}

/** Radix mints an id per instance; stable within a run, not across them. */
function normalise(markup: string): string {
  return markup
    .replace(/(radix-)?[«:][a-zA-Z0-9]+[»:]/g, '$1<id>')
    .replace(
      /(id|for|aria-controls|aria-labelledby|aria-describedby)="[^"]*"/g,
      '$1="<id>"',
    )
}

let teardown: () => void

beforeEach(() => {
  teardown = installRadixEnvironment()
  // The toast id is a counter, so a snapshot only stays stable if every file
  // starts it from the same place.
  resetActiveToastSequence()
  // `useId` seeds from the render order; without a reset the FAB menu's
  // `aria-controls` would drift as stories are added around it. Normalised
  // above too, belt and braces.
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  teardown()
})

describe('every chrome component ships at least three stories', () => {
  for (const [component, module] of MODULES) {
    it(`${component} has 3 or more`, () => {
      expect(storiesOf(module).length).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('every chrome component has at least three snapshotted stories', () => {
  for (const [component, module] of MODULES) {
    it(`${component} snapshots 3 or more`, () => {
      const snapshotted = storiesOf(module).filter(
        ([exportName]) => !SKIPPED_STORIES.has(`${component}/${exportName}`),
      )
      expect(snapshotted.length).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('story snapshots', () => {
  for (const [component, module] of MODULES) {
    describe(component, () => {
      for (const [exportName, story] of storiesOf(module)) {
        if (SKIPPED_STORIES.has(`${component}/${exportName}`)) continue
        it(exportName, () => {
          render(story.render())
          // `document.body`, not the render container: a portalled panel would
          // otherwise snapshot as an empty div and pass forever.
          expect(normalise(document.body.innerHTML)).toMatchSnapshot()
        })
      }
    })
  }
})
