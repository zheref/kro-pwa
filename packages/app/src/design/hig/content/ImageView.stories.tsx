import { ImageView } from './ImageView'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Content/Image view',
  component: ImageView,
}

function CoverFallback() {
  return (
    <span className="text-2xl" aria-hidden="true">
      📌
    </span>
  )
}

const FallbackCover = {
  name: 'Missing capture · the endeavor mark takes its place',
  render: () => (
    <HigStage>
      <HigRow label="No src, no network">
        <ImageView
          src=""
          alt="Cover for Write the port"
          aspect="4/3"
          caption="Write the port"
          fallback={<CoverFallback />}
        />
      </HigRow>
    </HigStage>
  ),
}

const Aspects = {
  name: 'Aspects · the frame holds the ratio',
  render: () => (
    <HigStage>
      <HigRow label="1 / 1">
        <ImageView
          src=""
          alt="Habit mark"
          aspect="1/1"
          fallback={<CoverFallback />}
        />
      </HigRow>
      <HigRow label="16 / 9">
        <ImageView
          src=""
          alt="Session capture"
          aspect="16/9"
          caption="Morning block"
          fallback={<CoverFallback />}
        />
      </HigRow>
    </HigStage>
  ),
}

const Circular = {
  name: 'Circular · Fluent Image shape and shadow',
  render: () => (
    <HigStage>
      <HigRow label="Circular with shadow">
        <ImageView
          src=""
          alt="Avatar"
          aspect="1/1"
          shape="circular"
          shadow
          fallback={<CoverFallback />}
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the recessed frame still reads',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Endeavor cover">
        <ImageView
          src=""
          alt="Cover for Complete with session"
          aspect="4/3"
          caption="Complete with session"
          fallback={<CoverFallback />}
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
        <ImageView
          density={density}
          src=""
          alt="Cover for Write the port"
          aspect="4/3"
          caption="Write the port"
          fallback={<CoverFallback />}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {FallbackCover.render()}
      {Aspects.render()}
      {Circular.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
