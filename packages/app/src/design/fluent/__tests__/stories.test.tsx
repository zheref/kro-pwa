/**
 * Snapshots of the Kro gallery's Fluent-origin Storybook stories.
 *
 * Same construction as the HIG snapshot suite: the subject is THE
 * STORY ITSELF. Radix-popper stories are omitted from snapshots.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as linkStories from '../actions/Link.stories'
import * as compoundStories from '../actions/CompoundButton.stories'
import * as splitStories from '../actions/SplitButton.stories'
import * as toggleButtonStories from '../actions/ToggleButton.stories'
import * as avatarStories from '../content/Avatar.stories'
import * as avatarGroupStories from '../content/AvatarGroup.stories'
import * as personaStories from '../content/Persona.stories'
import * as textStories from '../content/Text.stories'
import * as fieldStories from '../forms/Field.stories'
import * as infoLabelStories from '../forms/InfoLabel.stories'
import * as selectStories from '../forms/Select.stories'
import * as spinStories from '../forms/SpinButton.stories'
import * as tagPickerStories from '../forms/TagPicker.stories'
import * as accordionStories from '../navigation/Accordion.stories'
import * as cardStories from '../surfaces/Card.stories'
import * as carouselStories from '../surfaces/Carousel.stories'
import * as tooltipStories from '../surfaces/Tooltip.stories'
import * as badgeStories from '../status/Badge.stories'
import * as skeletonStories from '../status/Skeleton.stories'
import * as tagStories from '../status/Tag.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['Link', linkStories],
  ['Compound button', compoundStories],
  ['Split button', splitStories],
  ['Toggle button', toggleButtonStories],
  ['Avatar', avatarStories],
  ['Avatar group', avatarGroupStories],
  ['Persona', personaStories],
  ['Text', textStories],
  ['Field', fieldStories],
  ['Info label', infoLabelStories],
  ['Select', selectStories],
  ['Spin button', spinStories],
  ['Tag picker', tagPickerStories],
  ['Accordion', accordionStories],
  ['Card', cardStories],
  ['Carousel', carouselStories],
  ['Tooltip', tooltipStories],
  ['Badge', badgeStories],
  ['Skeleton', skeletonStories],
  ['Tag', tagStories],
]

const SNAPSHOTTED = MODULES.filter(
  ([component]) => component !== 'Split button',
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

function normalise(markup: string): string {
  return markup
    .replace(/(radix-)?[«:][a-zA-Z0-9]+[»:]/g, '$1<id>')
    .replace(
      /(id|for|name|aria-controls|aria-labelledby|aria-describedby)="[^"]*"/g,
      '$1="<id>"',
    )
}

afterEach(cleanup)

describe('every Fluent-origin story module ships one gallery page', () => {
  for (const [component, module] of MODULES) {
    it(`${component} is one Gallery`, () => {
      expect(storiesOf(module).map(([name]) => name)).toEqual(['Gallery'])
    })
  }
})

describe('Fluent-origin story snapshots', () => {
  for (const [component, module] of SNAPSHOTTED) {
    describe(component, () => {
      for (const [exportName, story] of storiesOf(module)) {
        it(exportName, () => {
          render(story.render())
          expect(normalise(document.body.innerHTML)).toMatchSnapshot()
        })
      }
    })
  }
})
