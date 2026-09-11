import { AvatarGroup } from './AvatarGroup'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Content/Avatar group',
  component: AvatarGroup,
}

const TEAM = [
  'Ada Lovelace',
  'Alan Turing',
  'Grace Hopper',
  'Katherine Johnson',
  'Dorothy Vaughan',
] as const

const SpreadAndStack = {
  name: 'Spread and stack · overflow is N more',
  render: () => (
    <FluentStage>
      <FluentRow label="Spread · default">
        <AvatarGroup names={TEAM} />
      </FluentRow>
      <FluentRow label="Stack">
        <AvatarGroup names={TEAM} layout="stack" />
      </FluentRow>
      <FluentRow label="Fits in max · no overflow">
        <AvatarGroup names={['Ada Lovelace', 'Alan Turing']} />
      </FluentRow>
    </FluentStage>
  ),
}

const Sizes = {
  name: 'Sizes · the overflow face matches the people',
  render: () => (
    <FluentStage>
      <FluentRow label="24">
        <AvatarGroup names={TEAM} size={24} />
      </FluentRow>
      <FluentRow label="40">
        <AvatarGroup names={TEAM} size={40} />
      </FluentRow>
      <FluentRow label="Stack at 48">
        <AvatarGroup names={TEAM} layout="stack" size={48} />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · colourful initials still separate',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Spread">
        <AvatarGroup names={TEAM} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <span data-density={density}>
          <AvatarGroup names={TEAM} layout="stack" />
        </span>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {SpreadAndStack.render()}
      {Sizes.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
