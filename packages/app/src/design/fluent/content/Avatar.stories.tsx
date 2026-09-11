import { AVATAR_SIZES, Avatar, PRESENCE_KINDS, presenceLabel } from './Avatar'
import { Text } from './Text'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Content/Avatar',
  component: Avatar,
}

const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

const Initials = {
  name: 'Initials · the letters are the signal',
  render: () => (
    <FluentStage>
      <FluentRow label="Brand · default">
        <Avatar name="Ada Lovelace" />
        <Avatar name="Alan Turing" />
        <Avatar name="Madonna" />
      </FluentRow>
      <FluentRow label="Neutral">
        <Avatar name="Grace Hopper" color="neutral" />
      </FluentRow>
      <FluentRow label="Colourful · hashed, still lettered">
        <Avatar name="Ada Lovelace" color="colorful" />
        <Avatar name="Alan Turing" color="colorful" />
        <Avatar name="Grace Hopper" color="colorful" />
        <Avatar name="Katherine Johnson" color="colorful" />
      </FluentRow>
    </FluentStage>
  ),
}

const SizesAndShapes = {
  name: 'Sizes and shapes · 16 through 128, circular or square',
  render: () => (
    <FluentStage>
      <FluentRow label="Circular">
        {AVATAR_SIZES.map((size) => (
          <Avatar key={size} name="Ada Lovelace" size={size} />
        ))}
      </FluentRow>
      <FluentRow label="Square">
        <Avatar name="Ada Lovelace" shape="square" />
        <Avatar name="Alan Turing" shape="square" size={48} />
      </FluentRow>
    </FluentStage>
  ),
}

const ImageAndPresence = {
  name: 'Image and presence · the word sits on the badge',
  render: () => (
    <FluentStage>
      <FluentRow label="Image">
        <Avatar name="Ada Lovelace" image={PIXEL} />
      </FluentRow>
      <FluentRow label="Presence · named, not a mute dot">
        {PRESENCE_KINDS.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-kro-tiny">
            <Avatar name="Ada Lovelace" presence={kind} />
            <Text size={200}>{presenceLabel(kind)}</Text>
          </span>
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · brand, colourful and presence still read',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Brand and colourful">
        <Avatar name="Ada Lovelace" />
        <Avatar name="Alan Turing" color="colorful" />
        <Avatar name="Grace Hopper" presence="available" />
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
          <Avatar name="Ada Lovelace" presence="available" />
        </span>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Initials.render()}
      {SizesAndShapes.render()}
      {ImageAndPresence.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
