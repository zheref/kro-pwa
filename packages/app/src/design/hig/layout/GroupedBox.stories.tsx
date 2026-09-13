import { GroupedBox } from './GroupedBox'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Layout/Grouped box',
  component: GroupedBox,
}

const GroupedInset = {
  name: 'Grouped inset · title sits above the card',
  render: () => (
    <HigStage>
      <GroupedBox
        title="Plan"
        footer="These stay in Inbox until you schedule them"
      >
        <div className="min-h-6 px-kro-medium py-kro-small">Inbox triage</div>
        <div className="min-h-6 px-kro-medium py-kro-small">Weekly review</div>
      </GroupedBox>
    </HigStage>
  ),
}

const Divided = {
  name: 'Divided · hairlines between related rows',
  render: () => (
    <HigStage>
      <HigRow label="Divided">
        <GroupedBox title="Do" divided>
          <div className="min-h-6 px-kro-medium py-kro-small">
            Morning session
          </div>
          <div className="min-h-6 px-kro-medium py-kro-small">Deep work</div>
          <div className="min-h-6 px-kro-medium py-kro-small">Earn sweep</div>
        </GroupedBox>
      </HigRow>
    </HigStage>
  ),
}

const Glass = {
  name: 'Glass · the material, not a tinted card',
  render: () => (
    <HigStage gradient>
      <GroupedBox title="Earn" material="glass" divided>
        <div className="min-h-6 px-kro-medium py-kro-small">Session points</div>
        <div className="min-h-6 px-kro-medium py-kro-small">Streak</div>
      </GroupedBox>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the card still lifts',
  render: () => (
    <HigBothSchemes>
      <GroupedBox title="Plan" divided>
        <div className="min-h-6 px-kro-medium py-kro-small">Inbox triage</div>
        <div className="min-h-6 px-kro-medium py-kro-small">Blueprint</div>
      </GroupedBox>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <GroupedBox density={density} title="Plan" divided>
          <div
            className={
              density === 'compact'
                ? 'min-h-6 px-kro-medium py-kro-tiny'
                : 'min-h-9 px-kro-medium py-kro-small'
            }
          >
            Inbox triage
          </div>
          <div
            className={
              density === 'compact'
                ? 'min-h-6 px-kro-medium py-kro-tiny'
                : 'min-h-9 px-kro-medium py-kro-small'
            }
          >
            Weekly review
          </div>
        </GroupedBox>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {GroupedInset.render()}
      {Divided.render()}
      {Glass.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
