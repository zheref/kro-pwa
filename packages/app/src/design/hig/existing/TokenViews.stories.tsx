import {
  ChipFlow,
  KroChip,
  colorTint,
  semanticTint,
} from '../../endeavor/KroChip'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Navigation and search/Token views',
  component: KroChip,
}

const Emphasis = {
  name: 'Emphasis · prominent, soft, outline',
  render: () => (
    <HigStage>
      <HigRow label="Prominent — the one identity chip">
        <KroChip
          title="Task"
          icon="checkmark.circle.fill"
          tint={semanticTint('kindTask')}
          emphasis="prominent"
        />
      </HigRow>
      <HigRow label="Soft — the workhorse">
        <KroChip
          title="Pending"
          icon="circle"
          tint={semanticTint('statusPending')}
        />
      </HigRow>
      <HigRow label="Outline — de-emphasised">
        <KroChip
          title="Not attached"
          icon="xmark"
          tint={semanticTint('chipNeutral')}
          emphasis="outline"
        />
      </HigRow>
    </HigStage>
  ),
}

const Wrapping = {
  name: 'ChipFlow · wraps rather than scrolling off-screen',
  render: () => (
    <HigStage width={360}>
      <HigRow label="Find filters">
        <ChipFlow>
          {[
            'Engaging',
            'On desk',
            'Session',
            'Deep work',
            'Quarterly',
            'Finance',
          ].map((tag) => (
            <KroChip
              key={tag}
              title={tag}
              icon="tag"
              tint={colorTint('payneGray')}
              size="small"
            />
          ))}
        </ChipFlow>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · glyph plus label, never colour alone',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Tokens">
        <ChipFlow>
          <KroChip
            title="Event"
            icon="calendar"
            tint={semanticTint('kindEvent')}
            emphasis="prominent"
          />
          <KroChip
            title="Ongoing"
            icon="play.circle.fill"
            tint={semanticTint('statusOngoing')}
          />
          <KroChip
            title="Unavailable"
            icon="xmark"
            tint={semanticTint('chipNeutral')}
            emphasis="outline"
          />
        </ChipFlow>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <KroChip
          title="Task"
          icon="checkmark.circle.fill"
          tint={semanticTint('kindTask')}
          size={density === 'compact' ? 'small' : 'regular'}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Emphasis.render()}
      {Wrapping.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
