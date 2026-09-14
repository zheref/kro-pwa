import { ComboBox } from './ComboBox'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

const ENDEAVORS = [
  'Write the launch note',
  'Morning focus session',
  'Plan the week',
  'Earn a break',
  'Inbox triage',
] as const

export default {
  title: 'Forms/Combo box',
  component: ComboBox,
}

const FindAnEndeavor = {
  name: 'Type or pick · the menu is a suggestion',
  render: () => (
    <HigStage>
      <HigRow label="Open the field to see titles">
        <ComboBox
          label="Find an endeavor"
          options={ENDEAVORS}
          placeholder="Start typing a title"
        />
      </HigRow>
    </HigStage>
  ),
}

const AlreadyNamed = {
  name: 'A value that is not on the list is still valid',
  render: () => (
    <HigStage>
      <HigRow label="Typed, not picked">
        <ComboBox
          label="Find an endeavor"
          options={ENDEAVORS}
          defaultValue="Draft the quarterly review"
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · glass still reads over the field',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="On the indigoGrape field">
        <ComboBox
          label="Find an endeavor"
          options={ENDEAVORS}
          defaultValue="Plan"
        />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <ComboBox
          density={density}
          label="Find an endeavor"
          options={ENDEAVORS}
          placeholder="Start typing a title"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {FindAnEndeavor.render()}
      {AlreadyNamed.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
