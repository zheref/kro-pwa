import { Skeleton, SkeletonItem } from './Skeleton'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Status/Skeleton',
  component: Skeleton,
}

function LoadingLabel() {
  return <span className="sr-only">Loading</span>
}

const Pulse = {
  name: 'Pulse · the default wait',
  render: () => (
    <FluentStage>
      <FluentRow label="A row of content arriving">
        <LoadingLabel />
        <Skeleton>
          <SkeletonItem height={12} />
          <SkeletonItem width="80%" height={12} />
          <SkeletonItem width="60%" height={12} />
        </Skeleton>
      </FluentRow>
    </FluentStage>
  ),
}

const WaveAndStill = {
  name: 'Wave and none · motion is optional',
  render: () => (
    <FluentStage>
      <FluentRow label="Wave">
        <LoadingLabel />
        <Skeleton animation="wave">
          <SkeletonItem height={16} />
          <SkeletonItem width="70%" height={16} />
        </Skeleton>
      </FluentRow>
      <FluentRow label="None">
        <LoadingLabel />
        <Skeleton animation="none">
          <SkeletonItem height={16} />
          <SkeletonItem width="70%" height={16} />
        </Skeleton>
      </FluentRow>
    </FluentStage>
  ),
}

const Shapes = {
  name: 'Shapes · rectangle and circle',
  render: () => (
    <FluentStage>
      <FluentRow label="Avatar and lines">
        <LoadingLabel />
        <Skeleton>
          <div className="flex items-center gap-3">
            <SkeletonItem shape="circle" width={40} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <SkeletonItem height={12} />
              <SkeletonItem width="50%" height={12} />
            </div>
          </div>
        </Skeleton>
      </FluentRow>
    </FluentStage>
  ),
}

const Appearances = {
  name: 'Opaque and translucent',
  render: () => (
    <FluentStage>
      <FluentRow label="Opaque">
        <LoadingLabel />
        <Skeleton appearance="opaque">
          <SkeletonItem height={16} />
        </Skeleton>
      </FluentRow>
      <FluentRow label="Translucent">
        <LoadingLabel />
        <Skeleton appearance="translucent">
          <SkeletonItem height={16} />
        </Skeleton>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · shape is still the signal',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Loading a card">
        <LoadingLabel />
        <Skeleton>
          <SkeletonItem height={12} />
          <SkeletonItem width="75%" height={12} />
        </Skeleton>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · the placeholder is the same size',
  render: () => (
    <FluentDensities
      render={() => (
        <>
          <LoadingLabel />
          <Skeleton>
            <SkeletonItem height={12} />
            <SkeletonItem width="60%" height={12} />
          </Skeleton>
        </>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Pulse.render()}
      {WaveAndStill.render()}
      {Shapes.render()}
      {Appearances.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
