/**
 * Snapshots of the Plan LIST, MATRIX, PICKER and VISIBILITY stories.
 *
 * The same arrangement `features/triage/pages/__tests__/stories.test.tsx` and
 * `design/endeavor/__tests__/stories.test.tsx` use, and for the same reason:
 * the Storybook test-runner needs a server and a Playwright browser that
 * `make test` starts neither of, so a regression in a story would otherwise be
 * caught by nobody on an ordinary run.
 *
 * THE SUBJECT IS THE STORY ITSELF, never a lookalike re-typed here — a snapshot
 * of a copy stays green while the thing people look at drifts away from it.
 *
 * What a snapshot proves and what it does not: it proves the markup, the class
 * composition and the token wiring are stable. It proves nothing about paint —
 * the glass material and the mode slide are browser answers, and the
 * screenshots in the PR are where those get looked at.
 *
 * ## Scope, and why this file sits here
 *
 * It covers the four surfaces KC-IS-#20 ships. The timeline surfaces
 * (`PlanFragment`, `PlanPage`, `TimelineFragment`, the day picker, the mode
 * picker, the banners) ship stories of their own and are **not** swept here:
 * they belong to KC-IS-#19's file lane, and adding their snapshots would put
 * this child's suite in the way of that one's edits. Extending the sweep is a
 * one-line-per-module follow-up for whoever next owns those files — named in
 * the PR body.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as listStories from '../list/PlanListFragment.stories'
import * as matrixStories from '../matrix/PlanMatrixFragment.stories'
import * as pickerStories from '../picker/PickEndeavorFragment.stories'
import * as visibilityStories from '../visibility/PlanVisibilityFragment.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['PlanListFragment', listStories],
  ['PlanMatrixFragment', matrixStories],
  ['PickEndeavorFragment', pickerStories],
  ['PlanVisibilityFragment', visibilityStories],
]

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

/** React mints ids for the picker's blocker line — normalise them out. */
function normalise(markup: string): string {
  return markup.replace(/(radix-)?[«:][a-zA-Z0-9]+[»:]/g, '$1<id>')
}

afterEach(cleanup)

describe('every KC-IS-#20 surface ships at least three stories', () => {
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
        it(exportName, () => {
          const { container } = render(story.render())
          expect(normalise(container.innerHTML)).toMatchSnapshot()
        })
      }
    })
  }
})
