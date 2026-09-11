import { ProgressIndicator } from './ProgressIndicator'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Status/Progress indicators',
  component: ProgressIndicator,
}

const Bar = {
  name: 'Bar · 0–1, the label is the non-colour signal',
  render: () => (
    <HigStage>
      <HigRow label="Syncing">
        <ProgressIndicator kind="bar" value={0.72} label="Syncing calendar" />
      </HigRow>
      <HigRow label="Empty">
        <ProgressIndicator kind="bar" value={0} label="Waiting on capture" />
      </HigRow>
    </HigStage>
  ),
}

const CircularAndIndeterminate = {
  name: 'Circular and indeterminate · the spinner is already in hig.css',
  render: () => (
    <HigStage>
      <HigRow label="Circular">
        <ProgressIndicator
          kind="circular"
          value={0.4}
          label="Uploading capture"
        />
      </HigRow>
      <HigRow label="Indeterminate">
        <ProgressIndicator kind="indeterminate" label="Opening session" />
      </HigRow>
      <HigRow label="Small">
        <ProgressIndicator
          kind="circular"
          value={0.6}
          size="sm"
          label="Almost there"
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the accent stroke still reads',
  render: () => (
    <HigBothSchemes>
      <HigRow label="In flight">
        <ProgressIndicator kind="bar" value={0.45} label="Syncing calendar" />
        <ProgressIndicator
          kind="circular"
          value={0.45}
          label="Syncing calendar"
        />
        <ProgressIndicator kind="indeterminate" label="Opening session" />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <>
          <ProgressIndicator
            density={density}
            kind="circular"
            value={0.4}
            label="Uploading capture"
          />
          <ProgressIndicator
            density={density}
            kind="indeterminate"
            label="Opening session"
          />
        </>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Bar.render()}
      {CircularAndIndeterminate.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
