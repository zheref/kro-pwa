import { Lockup } from './Lockup'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Content/Lockup',
  component: Lockup,
}

function Glyph({ mark }: { readonly mark: string }) {
  return (
    <span className="flex size-6 items-center justify-center rounded-kro-field bg-kro-back-next text-xs">
      {mark}
    </span>
  )
}

const Static = {
  name: 'Static · image, title, subtitle',
  render: () => (
    <HigStage>
      <Lockup
        title="Inbox triage"
        subtitle="Plan · Task"
        leading={<Glyph mark="📥" />}
      />
    </HigStage>
  ),
}

const Tappable = {
  name: 'Tappable · the whole row is the target',
  render: () => (
    <HigStage>
      <HigRow label="Tappable">
        <Lockup
          title="Morning run"
          subtitle="Habit · Earn"
          leading={<Glyph mark="🏃" />}
          onClick={() => {}}
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the lockup still reads as one unit',
  render: () => (
    <HigBothSchemes>
      <Lockup
        title="Weekly review"
        subtitle="Do · Event"
        leading={<Glyph mark="📅" />}
      />
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Lockup
          density={density}
          title="Inbox triage"
          subtitle="Plan · Task"
          leading={<Glyph mark="📥" />}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Static.render()}
      {Tappable.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
