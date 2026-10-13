/**
 * Snapshots of every landing story, and the evidence-set floor: each module
 * ships at least three stories (`RC-11`, `UZF-26`). The subject is THE STORY
 * ITSELF, rendered from its own `render` — the same construction as
 * `design/marketing/__tests__/stories.test.tsx`.
 */
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as earlyAccessFragment from '../../../earlyAccess/pages/EarlyAccessFragment.stories'
import * as earlyAccessPage from '../../../earlyAccess/pages/EarlyAccessPage.stories'
import * as earlyAccessSection from '../sections/EarlyAccessSection.stories'
import * as faqSection from '../sections/FaqSection.stories'
import * as federationSection from '../sections/FederationSection.stories'
import * as finalCtaSection from '../sections/FinalCtaSection.stories'
import * as focusSection from '../sections/FocusSection.stories'
import * as heroSection from '../sections/HeroSection.stories'
import * as landingFooter from '../sections/LandingFooter.stories'
import * as landingNav from '../sections/LandingNav.stories'
import * as loopSection from '../sections/LoopSection.stories'
import * as platformsSection from '../sections/PlatformsSection.stories'
import * as privacySection from '../sections/PrivacySection.stories'
import * as landingFragment from '../LandingFragment.stories'
import * as landingPage from '../LandingPage.stories'

interface Story {
  readonly name?: string
  readonly render: () => ReactElement
}

type StoryModule = Record<string, unknown>

const MODULES: ReadonlyArray<[string, StoryModule]> = [
  ['EarlyAccessFragment', earlyAccessFragment],
  ['EarlyAccessPage', earlyAccessPage],
  ['EarlyAccessSection', earlyAccessSection],
  ['FaqSection', faqSection],
  ['FederationSection', federationSection],
  ['FinalCtaSection', finalCtaSection],
  ['FocusSection', focusSection],
  ['HeroSection', heroSection],
  ['LandingFooter', landingFooter],
  ['LandingFragment', landingFragment],
  ['LandingNav', landingNav],
  ['LandingPage', landingPage],
  ['LoopSection', loopSection],
  ['PlatformsSection', platformsSection],
  ['PrivacySection', privacySection],
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

describe('every landing story module ships the visual evidence set', () => {
  for (const [component, module] of MODULES) {
    it(`${component} has at least three stories under Landing/${component}`, () => {
      expect(storiesOf(module).length).toBeGreaterThanOrEqual(3)
      expect((module.default as { title: string }).title).toBe(
        `Landing/${component}`,
      )
    })
  }
})

describe('landing story snapshots', () => {
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
