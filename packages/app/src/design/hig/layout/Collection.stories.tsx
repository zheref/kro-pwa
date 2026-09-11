import { Collection, CollectionItem } from './Collection'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Layout and organization/Collections',
  component: Collection,
}

const EndeavorKinds = {
  name: 'Endeavor kinds · two equal columns',
  render: () => (
    <HigStage>
      <Collection>
        <CollectionItem>Task</CollectionItem>
        <CollectionItem>Event</CollectionItem>
        <CollectionItem>Habit</CollectionItem>
        <CollectionItem>Blueprint</CollectionItem>
      </Collection>
    </HigStage>
  ),
}

const FourColumns = {
  name: 'Four columns · hosts and areas',
  render: () => (
    <HigStage>
      <HigRow label="Areas">
        <Collection columns={4} className="w-full">
          <CollectionItem>Plan</CollectionItem>
          <CollectionItem>Do</CollectionItem>
          <CollectionItem>Earn</CollectionItem>
          <CollectionItem>Review</CollectionItem>
        </Collection>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · tiles still read as cells',
  render: () => (
    <HigBothSchemes>
      <Collection>
        <CollectionItem>Task</CollectionItem>
        <CollectionItem>Event</CollectionItem>
        <CollectionItem>Habit</CollectionItem>
        <CollectionItem>Blueprint</CollectionItem>
      </Collection>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Collection density={density} className="w-full">
          <CollectionItem density={density}>Task</CollectionItem>
          <CollectionItem density={density}>Event</CollectionItem>
        </Collection>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {EndeavorKinds.render()}
      {FourColumns.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
