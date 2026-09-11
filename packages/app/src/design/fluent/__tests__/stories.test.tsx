/**
 * Snapshots of the Fluent 2 gallery's Storybook stories.
 *
 * Same construction as the HIG snapshot suite: the subject is THE
 * STORY ITSELF. Radix-popper stories are omitted from snapshots.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as overviewStories from '../FluentOverview.stories'
import * as linkStories from '../actions/Link.stories'
import * as compoundStories from '../actions/CompoundButton.stories'
import * as menuButtonStories from '../actions/MenuButton.stories'
import * as splitStories from '../actions/SplitButton.stories'
import * as toggleButtonStories from '../actions/ToggleButton.stories'
import * as buttonStories from '../existing/Buttons.stories'
import * as avatarStories from '../content/Avatar.stories'
import * as avatarGroupStories from '../content/AvatarGroup.stories'
import * as personaStories from '../content/Persona.stories'
import * as textStories from '../content/Text.stories'
import * as imageStories from '../existing/Image.stories'
import * as iconStories from '../existing/Icon.stories'
import * as fieldStories from '../forms/Field.stories'
import * as infoLabelStories from '../forms/InfoLabel.stories'
import * as selectStories from '../forms/Select.stories'
import * as spinStories from '../forms/SpinButton.stories'
import * as tagPickerStories from '../forms/TagPicker.stories'
import * as checkboxStories from '../existing/Checkbox.stories'
import * as comboboxStories from '../existing/Combobox.stories'
import * as dropdownStories from '../existing/Dropdown.stories'
import * as inputStories from '../existing/Input.stories'
import * as labelStories from '../existing/Label.stories'
import * as radioStories from '../existing/RadioGroup.stories'
import * as ratingStories from '../existing/Rating.stories'
import * as sliderStories from '../existing/Slider.stories'
import * as switchStories from '../existing/Switch.stories'
import * as textareaStories from '../existing/Textarea.stories'
import * as accordionStories from '../navigation/Accordion.stories'
import * as breadcrumbStories from '../navigation/Breadcrumb.stories'
import * as navStories from '../navigation/Nav.stories'
import * as tablistStories from '../existing/Tablist.stories'
import * as toolbarStories from '../existing/Toolbar.stories'
import * as treeStories from '../existing/Tree.stories'
import * as cardStories from '../surfaces/Card.stories'
import * as carouselStories from '../surfaces/Carousel.stories'
import * as tooltipStories from '../surfaces/Tooltip.stories'
import * as dialogStories from '../existing/Dialog.stories'
import * as dividerStories from '../existing/Divider.stories'
import * as drawerStories from '../existing/Drawer.stories'
import * as listStories from '../existing/List.stories'
import * as menuStories from '../existing/Menu.stories'
import * as popoverStories from '../existing/Popover.stories'
import * as badgeStories from '../status/Badge.stories'
import * as messageBarStories from '../status/MessageBar.stories'
import * as skeletonStories from '../status/Skeleton.stories'
import * as spinnerStories from '../status/Spinner.stories'
import * as tagStories from '../status/Tag.stories'
import * as progressStories from '../existing/ProgressBar.stories'
import * as toastStories from '../existing/Toast.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['Overview', overviewStories],
  ['Link', linkStories],
  ['Compound button', compoundStories],
  ['Menu button', menuButtonStories],
  ['Split button', splitStories],
  ['Toggle button', toggleButtonStories],
  ['Button', buttonStories],
  ['Avatar', avatarStories],
  ['Avatar group', avatarGroupStories],
  ['Persona', personaStories],
  ['Text', textStories],
  ['Image', imageStories],
  ['Icon', iconStories],
  ['Field', fieldStories],
  ['Info label', infoLabelStories],
  ['Select', selectStories],
  ['Spin button', spinStories],
  ['Tag picker', tagPickerStories],
  ['Checkbox', checkboxStories],
  ['Combobox', comboboxStories],
  ['Dropdown', dropdownStories],
  ['Input', inputStories],
  ['Label', labelStories],
  ['Radio group', radioStories],
  ['Rating', ratingStories],
  ['Slider', sliderStories],
  ['Switch', switchStories],
  ['Textarea', textareaStories],
  ['Accordion', accordionStories],
  ['Breadcrumb', breadcrumbStories],
  ['Nav', navStories],
  ['Tablist', tablistStories],
  ['Toolbar', toolbarStories],
  ['Tree', treeStories],
  ['Card', cardStories],
  ['Carousel', carouselStories],
  ['Tooltip', tooltipStories],
  ['Dialog', dialogStories],
  ['Divider', dividerStories],
  ['Drawer', drawerStories],
  ['List', listStories],
  ['Menu', menuStories],
  ['Popover', popoverStories],
  ['Badge', badgeStories],
  ['Message bar', messageBarStories],
  ['Skeleton', skeletonStories],
  ['Spinner', spinnerStories],
  ['Tag', tagStories],
  ['Progress bar', progressStories],
  ['Toast', toastStories],
]

const SNAPSHOTTED = MODULES.filter(
  ([component]) =>
    component !== 'Menu' &&
    component !== 'Dialog' &&
    component !== 'Drawer' &&
    component !== 'Popover' &&
    component !== 'Dropdown' &&
    component !== 'Menu button' &&
    component !== 'Split button',
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

describe('every Fluent 2 catalog story module ships one gallery page', () => {
  for (const [component, module] of MODULES) {
    it(`${component} is one Gallery`, () => {
      expect(storiesOf(module).map(([name]) => name)).toEqual(['Gallery'])
    })
  }
})

describe('Fluent 2 story snapshots', () => {
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
