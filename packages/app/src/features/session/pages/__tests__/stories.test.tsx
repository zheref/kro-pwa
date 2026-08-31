/**
 * Snapshots of the session surface's Storybook stories (`RC-11`, `UZF-26`).
 *
 * Same construction, and the same reasoning, as
 * `design/chrome/__tests__/stories.test.tsx`: the subject is **the story
 * itself**, not a lookalike re-typed here, so a snapshot cannot stay green
 * while the thing people actually look at drifts away from it. It runs under
 * Vitest rather than the Storybook test-runner because `make test` starts no
 * Storybook server and downloads no browser — a regression caught only by a
 * runner nobody runs is a regression caught by nobody.
 *
 * WHAT A SNAPSHOT HERE IS EVIDENCE OF: the markup, the class composition, the
 * reserved slot geometry that is applied as an inline value, and the token
 * wiring. What it is NOT evidence of: paint. Blur, the glass rim, the dial's
 * conic mask and the crossfade are browser answers, and the stories — plus the
 * screenshots in the PR — are where those get judged.
 */
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import * as pillStories from '../SessionPillFragment.stories'
import * as sheetStories from '../SessionSheetFragment.stories'
import * as surfaceStories from '../SessionSurfaceFragment.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['SessionSheet', sheetStories],
  ['SessionPill', pillStories],
  ['SessionSurface', surfaceStories],
]

/**
 * Two kinds of story are excluded, each for a stated, checkable reason.
 *
 * `SessionSheet/EmojiPickerOpen` mounts a **Radix popper** panel, which costs
 * 5–12 seconds per mount under jsdom — measured in
 * `design/system/primitives/__tests__/radixEnvironment.tsx`, where it turned
 * `make test` red. The design system excludes its own popper panels for the
 * same reason; the trigger's contract is asserted closed in
 * `SessionSheetFragment.test.tsx`, and the open panel is judged in the story.
 *
 * `SessionSurface/BottomSheet` and `SessionSurface/DesktopModal` **portal into
 * `document.body`**, so a snapshot of the story's own container would be empty
 * and would prove nothing about them. They are asserted through `screen` in
 * `SessionSurfaceFragment.test.tsx`, where a portal's contents are reachable.
 */
const SKIPPED_STORIES = new Set([
  'SessionSheet/EmojiPickerOpen',
  'SessionSurface/BottomSheet',
  'SessionSurface/DesktopModal',
])

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

beforeEach(() => {
  installRadixEnvironment()
})

afterEach(cleanup)

for (const [group, module] of MODULES) {
  const stories = storiesOf(module).filter(
    ([exportName]) => !SKIPPED_STORIES.has(`${group}/${exportName}`),
  )

  describe(group, () => {
    it('ships at least three stories, per RC-11', () => {
      expect(stories.length).toBeGreaterThanOrEqual(3)
    })

    it.each(stories)('renders the %s story as recorded', (_name, story) => {
      const { container } = render(story.render())
      expect(container.innerHTML).toMatchSnapshot()
    })
  })
}
