import { ActiveToastView } from '../../chrome/toast/ActiveToastView'
import { toActiveToast } from '../../chrome/toast/activeToast'
import { StoryGallery } from '../../storybook/storyGallery'
import { FluentBothSchemes, FluentRow, FluentStage } from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Status/Toast',
  component: ActiveToastView,
}

const COMPLETE = toActiveToast({
  message: '25 minutes of Focus landed.',
  icon: 'checkmark.circle.fill',
})

const Default = {
  name: 'Info · the product toast, restaged',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Transient">
        <ActiveToastView toast={COMPLETE} />
      </FluentRow>
    </FluentStage>
  ),
}

const WithAction = {
  name: 'With a recovery action',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Undo">
        <ActiveToastView
          toast={toActiveToast({
            message: 'Write the port was moved to the archive.',
            icon: 'checkmark.circle.fill',
            primaryAction: {
              title: 'Undo',
              style: 'standard',
              onSelect: () => {},
            },
          })}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const Reward = {
  name: 'Reward amount spoken, not colour alone',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Reward">
        <ActiveToastView
          toast={toActiveToast({
            message: 'Session complete',
            icon: 'checkmark.circle.fill',
            rewardAmount: 12,
          })}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Complete">
        <ActiveToastView toast={COMPLETE} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {WithAction.render()}
      {Reward.render()}
      {BothSchemes.render()}
    </StoryGallery>
  ),
}
