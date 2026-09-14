import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { PathControl } from './PathControl'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Navigation/Path control',
  component: PathControl,
}

const DEEP = [
  { id: 'plan', label: 'Plan' },
  { id: 'today', label: 'Today' },
  { id: 'endeavor', label: 'Write the KroTokens port' },
]

const Hierarchy = {
  name: 'Hierarchy · ancestors are buttons',
  render: () => (
    <HigStage>
      <HigRow label="Three levels">
        <PathControl items={DEEP} />
      </HigRow>
      <HigRow label="Overflow">
        <PathControl
          items={[
            { id: 'plan', label: 'Plan' },
            { id: 'today', label: 'Today' },
            { id: 'inbox', label: 'Inbox' },
            { id: 'triage', label: 'Triage' },
            { id: 'now', label: 'Write the KroTokens port' },
          ]}
          maxItems={3}
        />
      </HigRow>
    </HigStage>
  ),
}

const CurrentOnly = {
  name: 'Current only · nothing to jump to',
  render: () => (
    <HigStage>
      <HigRow label="A single crumb">
        <PathControl items={[{ id: 'today', label: 'Today' }]} />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the current crumb still reads',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Path">
        <PathControl items={DEEP} />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => <PathControl density={density} items={DEEP} />}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Hierarchy.render()}
      {CurrentOnly.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
