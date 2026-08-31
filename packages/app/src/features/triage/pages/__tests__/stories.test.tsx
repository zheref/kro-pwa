/**
 * Snapshots of the Triage surfaces' Storybook stories.
 *
 * The same arrangement `design/endeavor/__tests__/stories.test.tsx` uses, and
 * for the same reason: the Storybook test-runner needs a server and a
 * Playwright browser that `make test` starts neither of, so a regression here
 * would otherwise be caught by nobody on an ordinary run. These run under
 * Vitest, inside the gate that executes on every commit.
 *
 * THE SUBJECT IS THE STORY ITSELF, never a lookalike re-typed here — a snapshot
 * of a copy stays green while the thing people look at drifts away from it.
 *
 * What a snapshot proves and what it does not: it proves the markup, the class
 * composition and the token wiring are stable. It proves nothing about paint —
 * the glass material, the drag's motion and the carousel's translation are
 * browser answers, and the screenshots in the PR are where those get looked at.
 *
 * The Page stories are asynchronous by construction: their store loads its pool
 * through the real Producer and then opens the session through another, so the
 * sweep settles the microtask queue before it snapshots. That is the honest
 * shape — a synchronous snapshot would record the frame before the surface
 * exists and quietly assert nothing.
 */

import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as carouselStories from '../TriageCarouselFragment.stories'
import * as pageStories from '../TriageCarouselPage.stories'
import * as formStories from '../TriageFormFragment.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['TriageFormFragment', formStories],
  ['TriageCarouselFragment', carouselStories],
  ['TriageCarouselPage', pageStories],
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

/**
 * Let the store's own async chain land: the pool read, the flag read and the
 * session open are three awaits deep, and each one paints.
 */
async function settle(): Promise<void> {
  for (let round = 0; round < 6; round += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

/** React mints no ids here, but `aria-describedby` is conditional — normalise. */
function normalise(markup: string): string {
  return markup.replace(/(radix-)?[«:][a-zA-Z0-9]+[»:]/g, '$1<id>')
}

afterEach(cleanup)

describe('every Triage surface ships at least three stories', () => {
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
          const { container } = render(story.render())
          await settle()
          expect(normalise(container.innerHTML)).toMatchSnapshot()
        })
      }
    })
  }
})
