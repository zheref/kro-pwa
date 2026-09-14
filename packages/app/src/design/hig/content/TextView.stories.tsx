import { TextView } from './TextView'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Content/Text view',
  component: TextView,
}

const SessionNotes = {
  name: 'Session notes · the same field as a one-line Input',
  render: () => (
    <HigStage>
      <HigRow label="Ready">
        <TextView label="Session notes" placeholder="What did you get done?" />
      </HigRow>
    </HigStage>
  ),
}

const InvalidAndDisabled = {
  name: 'Invalid and disabled · named, and the fade is once',
  render: () => (
    <HigStage>
      <HigRow label="Invalid">
        <TextView
          label="Session notes"
          aria-invalid
          placeholder="A note is required before this can be saved."
        />
      </HigRow>
      <HigRow label="Disabled">
        <TextView
          label="Host notes"
          disabled
          defaultValue="This endeavor is read-only — it came from Google Calendar."
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the hairline is why it stays visible',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Live field">
        <TextView label="Session notes" defaultValue="Shipped the port." />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <TextView
          density={density}
          label="Session notes"
          placeholder="What did you get done?"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {SessionNotes.render()}
      {InvalidAndDisabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
