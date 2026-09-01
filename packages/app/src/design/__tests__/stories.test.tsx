/**
 * Snapshots of the design system's Storybook stories.
 *
 * WHICH RUNNER, AND WHY. `@storybook/test-runner` is installed and wired
 * (`pnpm --filter @kro/web test:storybook`), but it needs a Storybook server
 * and a Playwright browser download, and `make test` starts neither — so a
 * regression would be caught by nobody on an ordinary run. These snapshots run
 * under Vitest instead, inside the gate that actually executes on every commit
 * and in CI. The exception is the two Radix-popper components, which are the
 * other way round for a measured reason — see `SNAPSHOTTED` below.
 *
 * The subject is THE STORY ITSELF, not a lookalike re-typed here. KroApple's
 * `KroTokensSnapshotTests` shares its subject with the SwiftUI preview for
 * exactly this reason: a snapshot of a copy stays green while the thing people
 * look at drifts away from it.
 *
 * What a snapshot is and is not evidence of: it proves the markup, the class
 * composition and the token wiring are stable. It proves nothing about paint —
 * blur, sheen, gradients and placement are browser answers, and the stories
 * are where those get looked at.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../system/primitives/__tests__/radixEnvironment'
import * as buttonStories from '../system/primitives/button.stories'
import * as dialogStories from '../system/primitives/dialog.stories'
import * as dropdownMenuStories from '../system/primitives/dropdown-menu.stories'
import * as inputStories from '../system/primitives/input.stories'
import * as popoverStories from '../system/primitives/popover.stories'
import * as sheetStories from '../system/primitives/sheet.stories'
import * as tabsStories from '../system/primitives/tabs.stories'
import * as glassStories from '../system/glass/GlassSurface.stories'
import * as gradientStories from '../system/gradient/GradientBackdrop.stories'
import * as detailBackdropStories from '../system/gradient/DetailBackdrop.stories'
import * as onGradientStories from '../system/gradient/OnGradient.stories'
import * as tokenStories from '../system/tokens/Tokens.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['Tokens', tokenStories],
  ['KroGlass', glassStories],
  ['GradientBackdrop', gradientStories],
  ['DetailBackdrop', detailBackdropStories],
  ['OnGradient', onGradientStories],
  ['Button', buttonStories],
  ['Input', inputStories],
  ['Dialog', dialogStories],
  ['Sheet', sheetStories],
  ['Popover', popoverStories],
  ['DropdownMenu', dropdownMenuStories],
  ['Tabs', tabsStories],
]

/**
 * Snapshotted here, under Vitest. The two omissions are the components built
 * on Radix's popper: mounting one under jsdom costs seconds of wall time and
 * turned this gate red (measured in `radixEnvironment.tsx`).
 *
 * Their stories belong to the Storybook test-runner instead —
 * `pnpm --filter @kro/web test:storybook` — which drives a real browser where
 * the mount is cheap and the placement it captures is worth capturing. That
 * runner is wired but is not part of `make test` and has not been executed
 * yet, so those two components currently have no automated snapshot. Their
 * stories still build, and their theming contract is asserted directly in
 * `popover.test.tsx` and `dropdown-menu.test.tsx`.
 *
 * Every module is still counted below, so a component cannot drop below three
 * stories in either runner.
 */
const SNAPSHOTTED = MODULES.filter(
  ([component]) => component !== 'Popover' && component !== 'DropdownMenu',
)

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

/**
 * Radix mints an id per instance. It is stable within a run but not across
 * them, so it is normalised out — otherwise every snapshot would be a diff.
 */
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
})

afterEach(() => {
  cleanup()
  teardown()
})

describe('every design-system component ships at least three stories', () => {
  for (const [component, module] of MODULES) {
    it(`${component} has 3 or more`, () => {
      expect(storiesOf(module).length).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('story snapshots', () => {
  for (const [component, module] of SNAPSHOTTED) {
    describe(component, () => {
      for (const [exportName, story] of storiesOf(module)) {
        it(exportName, () => {
          render(story.render())
          // `document.body`, not the render container: Radix portals its
          // overlays and panels to the body, so a container-only snapshot of a
          // dialog would record an empty div and pass forever.
          expect(normalise(document.body.innerHTML)).toMatchSnapshot()
        })
      }
    })
  }
})
