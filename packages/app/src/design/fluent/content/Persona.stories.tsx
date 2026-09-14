import { Persona, type PersonaSize } from './Persona'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Content/Persona',
  component: Persona,
}

const PERSONA_SIZES: readonly PersonaSize[] = [
  'extra-small',
  'small',
  'medium',
  'large',
  'extra-large',
  'huge',
]

const Sizes = {
  name: 'Sizes · presence rides on the avatar, copy is words',
  render: () => (
    <FluentStage>
      {PERSONA_SIZES.map((size) => (
        <FluentRow key={size} label={size}>
          <Persona
            name="Ada Lovelace"
            size={size}
            presence="available"
            secondaryText="Available · Mathematician"
            tertiaryText="Analytical Engine"
          />
        </FluentRow>
      ))}
    </FluentStage>
  ),
}

const Alignment = {
  name: 'Alignment · start beside center',
  render: () => (
    <FluentStage>
      <FluentRow label="Start · default">
        <Persona
          name="Alan Turing"
          secondaryText="Away · Cryptanalyst"
          presence="away"
        />
      </FluentRow>
      <FluentRow label="Center">
        <Persona
          name="Grace Hopper"
          textAlignment="center"
          secondaryText="Busy · Rear Admiral"
          tertiaryText="COBOL"
          presence="busy"
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the name still leads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Available">
        <Persona
          name="Ada Lovelace"
          presence="available"
          secondaryText="Available · Mathematician"
          tertiaryText="Analytical Engine"
        />
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
          <Persona
            name="Ada Lovelace"
            presence="available"
            secondaryText="Available · Mathematician"
          />
        </span>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Sizes.render()}
      {Alignment.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
