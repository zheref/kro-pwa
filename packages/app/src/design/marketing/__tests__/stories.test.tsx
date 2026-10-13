/**
 * Snapshots of every marketing story.
 *
 * Same construction as `design/hig/__tests__/stories.test.tsx`: the subject is
 * THE STORY ITSELF, rendered from its own `render`. A story module must ship
 * at least three stories, so the `UZF-26` evidence set cannot quietly shrink.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as backToTop from '../BackToTop.stories'
import * as featureCard from '../FeatureCard.stories'
import * as glassCta from '../GlassCta.stories'
import * as macWindowFrame from '../MacWindowFrame.stories'
import * as marketingFooter from '../MarketingFooter.stories'
import * as marketingNav from '../MarketingNav.stories'
import * as marketingSection from '../MarketingSection.stories'
import * as phoneFrame from '../PhoneFrame.stories'
import * as platformBadge from '../PlatformBadge.stories'
import * as reveal from '../Reveal.stories'
import * as sectionHeader from '../SectionHeader.stories'
import * as statRow from '../StatRow.stories'
import * as themeToggle from '../ThemeToggle.stories'
import * as watchFrame from '../WatchFrame.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['BackToTop', backToTop],
  ['FeatureCard', featureCard],
  ['GlassCta', glassCta],
  ['MacWindowFrame', macWindowFrame],
  ['MarketingFooter', marketingFooter],
  ['MarketingNav', marketingNav],
  ['MarketingSection', marketingSection],
  ['PhoneFrame', phoneFrame],
  ['PlatformBadge', platformBadge],
  ['Reveal', reveal],
  ['SectionHeader', sectionHeader],
  ['StatRow', statRow],
  ['ThemeToggle', themeToggle],
  ['WatchFrame', watchFrame],
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

function normalise(markup: string): string {
  return markup
    .replace(/(radix-)?[«:][a-zA-Z0-9]+[»:]/g, '$1<id>')
    .replace(
      /(id|for|name|aria-controls|aria-labelledby|aria-describedby)="(?:radix-)?[^"]*[«:][^"]*"/g,
      '$1="<id>"',
    )
}

afterEach(cleanup)

describe('every marketing story module ships the visual evidence set', () => {
  for (const [component, module] of MODULES) {
    it(`${component} has at least three stories under Marketing/${component}`, () => {
      expect(storiesOf(module).length).toBeGreaterThanOrEqual(3)
      expect((module.default as { title: string }).title).toBe(
        `Marketing/${component}`,
      )
    })
  }
})

describe('marketing story snapshots', () => {
  for (const [component, module] of MODULES) {
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
