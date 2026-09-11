import { Carousel } from './Carousel'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Surfaces/Carousel',
  component: Carousel,
}

const SLIDES = [
  {
    id: 'today',
    title: 'Today',
    content: 'Morning session, then inbox until lunch.',
  },
  {
    id: 'plan',
    title: 'Plan',
    content: 'Triage stays in Inbox until you schedule it.',
  },
  {
    id: 'earn',
    title: 'Earn',
    content: 'Session points land when you complete a block.',
  },
]

const Paging = {
  name: 'Paging · numbered, never dots-only',
  render: () => (
    <FluentStage>
      <FluentRow label="Three slides">
        <Carousel slides={SLIDES} />
      </FluentRow>
    </FluentStage>
  ),
}

const Named = {
  name: 'Named region · a label of its own',
  render: () => (
    <FluentStage>
      <FluentRow label="aria-label">
        <Carousel
          slides={SLIDES}
          label="Endeavor highlights"
          defaultIndex={1}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the count still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Carousel">
        <Carousel slides={SLIDES} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · the same control on both stages',
  render: () => <FluentDensities render={() => <Carousel slides={SLIDES} />} />,
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Paging.render()}
      {Named.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
