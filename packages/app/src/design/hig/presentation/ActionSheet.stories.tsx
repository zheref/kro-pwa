import { Button } from '../../system/primitives/button'
import { HigDensities, HigStage } from '../higStoryStage'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  ActionSheet,
  ActionSheetAction,
  ActionSheetContent,
  ActionSheetTitle,
  ActionSheetTrigger,
} from './ActionSheet'

export default {
  title: 'Surfaces/Action sheet',
  component: ActionSheetContent,
  parameters: { layout: 'fullscreen' },
}

const ThreeActions = {
  name: 'Complete · Reschedule · Delete',
  render: () => (
    <HigStage gradient>
      <ActionSheet>
        <ActionSheetTrigger asChild>
          <Button variant="primary">Write the KroTokens port</Button>
        </ActionSheetTrigger>
        <ActionSheetContent>
          <ActionSheetTitle>Write the KroTokens port</ActionSheetTitle>
          <ActionSheetAction>Complete</ActionSheetAction>
          <ActionSheetAction>Reschedule</ActionSheetAction>
          <ActionSheetAction tone="destructive">
            Delete endeavor
          </ActionSheetAction>
          <ActionSheetAction tone="cancel">Cancel</ActionSheetAction>
        </ActionSheetContent>
      </ActionSheet>
    </HigStage>
  ),
}

const DestructiveAndCancel = {
  name: 'Destructive and cancel · named, not just red',
  render: () => (
    <HigStage>
      <ActionSheet>
        <ActionSheetTrigger asChild>
          <Button variant="destructive">Delete this endeavor</Button>
        </ActionSheetTrigger>
        <ActionSheetContent>
          <ActionSheetTitle>Delete this endeavor?</ActionSheetTitle>
          <ActionSheetAction tone="destructive">
            Delete endeavor
          </ActionSheetAction>
          <ActionSheetAction tone="cancel">Cancel</ActionSheetAction>
        </ActionSheetContent>
      </ActionSheet>
    </HigStage>
  ),
}

const DarkScheme = {
  name: 'Dark · the sheet still rises',
  render: () => (
    <HigStage theme="dark" gradient>
      <ActionSheet>
        <ActionSheetTrigger asChild>
          <Button variant="primary">Today</Button>
        </ActionSheetTrigger>
        <ActionSheetContent>
          <ActionSheetTitle>Today</ActionSheetTitle>
          <ActionSheetAction>Complete</ActionSheetAction>
          <ActionSheetAction tone="cancel">Cancel</ActionSheetAction>
        </ActionSheetContent>
      </ActionSheet>
    </HigStage>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <div className="flex w-64 flex-col gap-1">
          <ActionSheetAction density={density}>Complete</ActionSheetAction>
          <ActionSheetAction density={density} tone="cancel">
            Cancel
          </ActionSheetAction>
        </div>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {ThreeActions.render()}
      {DestructiveAndCancel.render()}
      {DarkScheme.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
