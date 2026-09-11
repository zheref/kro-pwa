import { Gauge } from './Gauge'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Status/Gauges',
  component: Gauge,
}

const DailyFocus = {
  name: 'Daily focus · the percentage sits in the bowl',
  render: () => (
    <HigStage>
      <HigRow label="In progress">
        <Gauge value={0.72} label="72%" caption="Daily focus" />
      </HigRow>
    </HigStage>
  ),
}

const EmptyAndClosed = {
  name: 'Empty and closed · the track is why zero still reads',
  render: () => (
    <HigStage>
      <HigRow label="Not started">
        <Gauge value={0} label="0%" caption="Habits closed" />
      </HigRow>
      <HigRow label="Closed">
        <Gauge value={1} label="100%" caption="Habits closed" />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the accent arc still reads',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Daily focus">
        <Gauge value={0.72} label="72%" caption="Daily focus" />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Gauge
          density={density}
          value={0.72}
          label="72%"
          caption="Daily focus"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {DailyFocus.render()}
      {EmptyAndClosed.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
