import { Timer, Watch } from 'lucide-react'
import { useState } from 'react'
import { StoryGallery } from '../../storybook/storyGallery'
import { colorVar } from '../../system/tokens/roles'
import { HigBothSchemes, HigRow, HigStage } from '../higStoryStage'
import { SegmentedControl } from './SegmentedControl'

export default {
  title: 'Forms/Segmented control',
  component: SegmentedControl,
}

const MODES = [
  {
    value: 'countdown',
    label: 'Pomodoro',
    icon: <Timer aria-hidden="true" className="size-3" />,
  },
  {
    value: 'stopwatch',
    label: 'Stopwatch',
    icon: <Watch aria-hidden="true" className="size-3" />,
  },
] as const

function Live({
  density,
  tint,
}: {
  readonly density: 'compact' | 'comfortable'
  readonly tint?: string
}) {
  const [value, setValue] = useState<'countdown' | 'stopwatch'>('countdown')
  return (
    <SegmentedControl
      label="Session mode"
      options={MODES}
      value={value}
      onChange={setValue}
      density={density}
      selectionTint={tint ?? null}
    />
  )
}

const Densities = {
  name: 'Compact and comfortable · desktop and touch',
  render: () => (
    <HigStage>
      <HigRow label="Compact (desktop)">
        <Live density="compact" />
      </HigRow>
      <HigRow label="Comfortable (touch)">
        <Live density="comfortable" />
      </HigRow>
    </HigStage>
  ),
}

const Tinted = {
  name: 'A tinted selection · the session mode toggle',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Focus green">
        <Live density="compact" tint={colorVar('focusGreen')} />
      </HigRow>
    </HigBothSchemes>
  ),
}

const ThreeAndDisabled = {
  name: 'Three segments, and disabled mid-session',
  render: () => (
    <HigStage>
      <HigRow label="Three">
        <SegmentedControl
          label="Range"
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          value="week"
          onChange={() => {}}
        />
      </HigRow>
      <HigRow label="Disabled">
        <SegmentedControl
          label="Session mode"
          options={MODES}
          value="countdown"
          onChange={() => {}}
          disabled
        />
      </HigRow>
    </HigStage>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Densities.render()}
      {Tinted.render()}
      {ThreeAndDisabled.render()}
    </StoryGallery>
  ),
}
