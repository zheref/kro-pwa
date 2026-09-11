import { DigitEntry } from './DigitEntry'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Selection and input/Digit entry views',
  component: DigitEntry,
}

const SessionPin = {
  name: 'Four cells · one hidden field',
  render: () => (
    <HigStage>
      <HigRow label="Unlock this session">
        <DigitEntry aria-label="Session PIN" />
      </HigRow>
    </HigStage>
  ),
}

const Masked = {
  name: 'Masked · the dots are the glyphs, not the value',
  render: () => (
    <HigStage>
      <HigRow label="A PIN already entered">
        <DigitEntry aria-label="Unlock PIN" defaultValue="2580" mask />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the cells still read',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="On the indigoGrape field">
        <DigitEntry aria-label="Session PIN" defaultValue="19" />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <DigitEntry
          density={density}
          aria-label="Session PIN"
          defaultValue="19"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {SessionPin.render()}
      {Masked.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
