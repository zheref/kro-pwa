/**
 * Snapshots of the endeavor kit's Storybook stories.
 *
 * The same arrangement the design system already uses
 * (`design/__tests__/stories.test.tsx`), and for the same reason: the Storybook
 * test-runner needs a server and a Playwright browser that `make test` starts
 * neither of, so a regression would be caught by nobody on an ordinary run.
 * These snapshots run under Vitest, inside the gate that executes on every
 * commit.
 *
 * THE SUBJECT IS THE STORY ITSELF, never a lookalike re-typed here. That is the
 * property that makes a snapshot worth having: a snapshot of a copy stays green
 * while the thing people look at drifts away from it.
 *
 * What a snapshot proves and what it does not: it proves the markup, the class
 * composition and the token wiring are stable. It proves nothing about paint —
 * blur, the glass material, the gradient and the wiggle are browser answers, and
 * the stories are where those get looked at.
 *
 * Every story module is counted, so no component can drop below three stories.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../system/primitives/__tests__/radixEnvironment'
import * as actionSurfaceStories from '../EndeavorActionSurface.stories'
import * as cardBadgeStories from '../CardBadge.stories'
import * as cardStories from '../EndeavorCard.stories'
import * as compactHeaderStories from '../CompactPresentationHeader.stories'
import * as emptyDayStories from '../EmptyDayStateView.stories'
import * as emptyStateCardStories from '../EmptyStateCard.stories'
import * as inlineBannerStories from '../InlineBanner.stories'
import * as kroChipStories from '../KroChip.stories'
import * as popoverStories from '../endeavorPopovers.stories'
import * as propertyRowStories from '../PropertyRow.stories'
import * as rowStories from '../EndeavorRow.stories'
import * as suggestionStories from '../SuggestionCard.stories'
import * as surfaceCardStories from '../SurfaceCard.stories'
import * as taskRowStories from '../TaskRow.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['CardBadge', cardBadgeStories],
  ['KroChip', kroChipStories],
  ['InlineBanner', inlineBannerStories],
  ['SurfaceCard', surfaceCardStories],
  ['PropertyRow', propertyRowStories],
  ['EmptyStateCard', emptyStateCardStories],
  ['EmptyStates', emptyDayStories],
  ['CompactPresentationHeader', compactHeaderStories],
  ['SuggestionCard', suggestionStories],
  ['TaskRow', taskRowStories],
  ['Popovers', popoverStories],
  ['EndeavorActionSurface', actionSurfaceStories],
  ['EndeavorRow', rowStories],
  ['EndeavorCard', cardStories],
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

describe('every component in the kit ships at least three stories', () => {
  for (const [component, module] of MODULES) {
    it(`${component} has 3 or more`, () => {
      expect(storiesOf(module).length).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('story snapshots', () => {
  for (const [component, module] of MODULES) {
    describe(component, () => {
      for (const [exportName, story] of storiesOf(module)) {
        it(exportName, () => {
          const { container } = render(story.render())
          // The container, not `document.body`: nothing in this kit portals
          // while closed, and a body snapshot would pick up React's own
          // scratch nodes.
          expect(normalise(container.innerHTML)).toMatchSnapshot()
        })
      }
    })
  }
})
