import { Text, TEXT_SIZES, type TextWeight } from './Text'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Content/Text',
  component: Text,
}

const WEIGHTS: readonly TextWeight[] = ['regular', 'medium', 'semibold', 'bold']

const Ramp = {
  name: 'Size ramp · 100 through 1000',
  render: () => (
    <FluentStage>
      {TEXT_SIZES.map((size) => (
        <FluentRow key={size} label={String(size)}>
          <Text size={size}>The morning block is on the card.</Text>
        </FluentRow>
      ))}
    </FluentStage>
  ),
}

const WeightToneWrap = {
  name: 'Weight, tone, italic, wrap and truncate',
  render: () => (
    <FluentStage>
      <FluentRow label="Weights">
        {WEIGHTS.map((weight) => (
          <Text key={weight} weight={weight}>
            {weight}
          </Text>
        ))}
      </FluentRow>
      <FluentRow label="Tones · the words are the signal">
        <Text tone="primary">Primary copy</Text>
        <Text tone="secondary">Secondary copy</Text>
        <Text tone="destructive">Delete this endeavor</Text>
      </FluentRow>
      <FluentRow label="Italic">
        <Text italic>A caption in italic</Text>
      </FluentRow>
      <FluentRow label="No wrap">
        <Text wrap={false}>One line that must not wrap.</Text>
      </FluentRow>
      <FluentRow label="Truncate">
        <span className="block w-32">
          <Text truncate>
            A long line about the morning block that should ellipsize.
          </Text>
        </span>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · primary, secondary and destructive',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Tones">
        <Text>Inbox triage</Text>
        <Text tone="secondary">Plan · Task</Text>
        <Text tone="destructive">Delete this endeavor</Text>
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
          <Text size={400} weight="semibold">
            Session notes
          </Text>
        </span>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Ramp.render()}
      {WeightToneWrap.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
