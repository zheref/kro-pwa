import { Disclosure } from './Disclosure'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Layout/Disclosure',
  component: Disclosure,
}

const Closed = {
  name: 'Closed · the chevron is the state',
  render: () => (
    <HigStage>
      <Disclosure title="Session details">
        Complete with session. Focus sounds stay off until you start.
      </Disclosure>
    </HigStage>
  ),
}

const Open = {
  name: 'Open · defaultOpen, still dismissible',
  render: () => (
    <HigStage>
      <HigRow label="Open">
        <Disclosure title="Reminders" defaultOpen>
          Inbox triage is due after the morning run.
        </Disclosure>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the chevron still reads',
  render: () => (
    <HigBothSchemes>
      <Disclosure title="Earn" defaultOpen>
        Session points land when you complete a block, not when you schedule it.
      </Disclosure>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Disclosure density={density} title="Session details">
          Complete with session. Focus sounds stay off until you start.
        </Disclosure>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Closed.render()}
      {Open.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
