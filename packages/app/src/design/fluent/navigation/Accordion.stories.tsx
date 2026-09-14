import { Accordion } from './Accordion'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

export default {
  title: 'Navigation/Accordion',
  component: Accordion,
}

const ITEMS = [
  {
    id: 'session',
    title: 'Session',
    content: 'Complete with session. Focus sounds stay off until you start.',
  },
  {
    id: 'reminders',
    title: 'Reminders',
    content: 'Inbox triage is due after the morning run.',
  },
  {
    id: 'earn',
    title: 'Earn',
    content:
      'Session points land when you complete a block, not when you schedule it.',
  },
]

const Exclusive = {
  name: 'Exclusive · one panel at a time',
  render: () => (
    <FluentStage>
      <FluentRow label="Closed, then one open">
        <Accordion items={ITEMS} defaultOpenIds={['session']} />
      </FluentRow>
    </FluentStage>
  ),
}

const Multiple = {
  name: 'Multiple · several panels can stay open',
  render: () => (
    <FluentStage>
      <FluentRow label="Two open">
        <Accordion
          items={ITEMS}
          multiple
          defaultOpenIds={['session', 'earn']}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const LockedOpen = {
  name: 'Not collapsible · the last panel stays open',
  render: () => (
    <FluentStage>
      <FluentRow label="Must keep one">
        <Accordion
          items={ITEMS}
          collapsible={false}
          defaultOpenIds={['reminders']}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the chevron still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Open">
        <Accordion items={ITEMS} defaultOpenIds={['session']} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact small, comfortable medium',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Accordion
          size={fluentSizeForDensity(density)}
          items={ITEMS}
          defaultOpenIds={['session']}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Exclusive.render()}
      {Multiple.render()}
      {LockedOpen.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
