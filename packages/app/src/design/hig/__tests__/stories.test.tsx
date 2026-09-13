/**
 * Snapshots of the Kro gallery's HIG-origin Storybook stories.
 *
 * Same construction as `design/__tests__/stories.test.tsx`: the subject is
 * THE STORY ITSELF. Radix-popper stories (menus, popovers) are omitted from
 * snapshots — mounting them under jsdom stalls the worker (see
 * `radixEnvironment.tsx`). They still ship a gallery page.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as popupButtonStories from '../actions/PopupButton.stories'
import * as pullDownButtonStories from '../actions/PullDownButton.stories'
import * as chartStories from '../content/Chart.stories'
import * as imageViewStories from '../content/ImageView.stories'
import * as textViewStories from '../content/TextView.stories'
import * as webViewStories from '../content/WebView.stories'
import * as collectionStories from '../layout/Collection.stories'
import * as columnViewStories from '../layout/ColumnView.stories'
import * as disclosureStories from '../layout/Disclosure.stories'
import * as groupedBoxStories from '../layout/GroupedBox.stories'
import * as labelStories from '../layout/Label.stories'
import * as listStories from '../layout/List.stories'
import * as lockupStories from '../layout/Lockup.stories'
import * as outlineStories from '../layout/OutlineView.stories'
import * as scrollViewStories from '../layout/ScrollView.stories'
import * as separatorStories from '../layout/Separator.stories'
import * as splitViewStories from '../layout/SplitView.stories'
import * as navigationBarStories from '../navigation/NavigationBar.stories'
import * as pathControlStories from '../navigation/PathControl.stories'
import * as searchFieldStories from '../navigation/SearchField.stories'
import * as sidebarStories from '../navigation/Sidebar.stories'
import * as tabBarStories from '../navigation/TabBar.stories'
import * as toolbarStories from '../navigation/Toolbar.stories'
import * as actionSheetStories from '../presentation/ActionSheet.stories'
import * as alertStories from '../presentation/Alert.stories'
import * as panelStories from '../presentation/Panel.stories'
import * as checkboxStories from '../selection/Checkbox.stories'
import * as colorWellStories from '../selection/ColorWell.stories'
import * as comboBoxStories from '../selection/ComboBox.stories'
import * as digitEntryStories from '../selection/DigitEntry.stories'
import * as pickerStories from '../selection/Picker.stories'
import * as radioStories from '../selection/RadioGroup.stories'
import * as sliderStories from '../selection/Slider.stories'
import * as stepperStories from '../selection/Stepper.stories'
import * as toggleStories from '../selection/Toggle.stories'
import * as gaugeStories from '../status/Gauge.stories'
import * as progressStories from '../status/ProgressIndicator.stories'
import * as ratingStories from '../status/RatingIndicator.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['Pop-up button', popupButtonStories],
  ['Pull-down button', pullDownButtonStories],
  ['Chart', chartStories],
  ['Image view', imageViewStories],
  ['Text view', textViewStories],
  ['Web view', webViewStories],
  ['Grouped box', groupedBoxStories],
  ['Collection', collectionStories],
  ['Column view', columnViewStories],
  ['Disclosure', disclosureStories],
  ['Label', labelStories],
  ['List', listStories],
  ['Lockup', lockupStories],
  ['Outline view', outlineStories],
  ['Split view', splitViewStories],
  ['Separator', separatorStories],
  ['Navigation bar', navigationBarStories],
  ['Path control', pathControlStories],
  ['Search field', searchFieldStories],
  ['Sidebar', sidebarStories],
  ['Tab bar', tabBarStories],
  ['Toolbar', toolbarStories],
  ['Action sheet', actionSheetStories],
  ['Alert', alertStories],
  ['Panel', panelStories],
  ['Scroll view', scrollViewStories],
  ['Checkbox', checkboxStories],
  ['Color well', colorWellStories],
  ['Combo box', comboBoxStories],
  ['Digit entry', digitEntryStories],
  ['Picker', pickerStories],
  ['Radio group', radioStories],
  ['Slider', sliderStories],
  ['Stepper', stepperStories],
  ['Toggle', toggleStories],
  ['Gauge', gaugeStories],
  ['Progress indicator', progressStories],
  ['Rating indicator', ratingStories],
]

const SNAPSHOTTED = MODULES.filter(
  ([component]) =>
    component !== 'Pop-up button' && component !== 'Pull-down button',
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

describe('every HIG-origin story module ships one gallery page', () => {
  for (const [component, module] of MODULES) {
    it(`${component} is one Gallery`, () => {
      expect(storiesOf(module).map(([name]) => name)).toEqual(['Gallery'])
    })
  }
})

describe('HIG-origin story snapshots', () => {
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
