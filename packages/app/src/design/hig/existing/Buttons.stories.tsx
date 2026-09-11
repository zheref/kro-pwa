import { Check, Plus, Trash2 } from 'lucide-react'
import { Button, buttonSizeForDensity } from '../../system/primitives/button'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Actions/Buttons',
  component: Button,
}

const Variants = {
  name: 'Variants · one primary per surface',
  render: () => (
    <HigStage gradient>
      <HigRow label="Variants">
        <Button variant="primary">Start session</Button>
        <Button variant="secondary">Reschedule</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="destructive">Delete endeavor</Button>
        <Button variant="glass">Focus</Button>
      </HigRow>
    </HigStage>
  ),
}

const Sizes = {
  name: 'Sizes · compact default, comfortable is md, lg is the 44px floor',
  render: () => (
    <HigStage>
      <HigRow label="Compact · comfortable · large · pill">
        <Button size={buttonSizeForDensity('compact')}>Compact</Button>
        <Button size={buttonSizeForDensity('comfortable')}>Comfortable</Button>
        <Button size="lg">Large</Button>
        <Button size="pill">Pill</Button>
      </HigRow>
      <HigRow label="Icon only">
        <Button size="icon" aria-label="Add endeavor">
          <Plus />
        </Button>
        <Button size="icon-sm" aria-label="Add endeavor">
          <Plus />
        </Button>
      </HigRow>
    </HigStage>
  ),
}

const WithIcons = {
  name: 'With icons · the action is still a word',
  render: () => (
    <HigStage>
      <HigRow label="Leading glyph">
        <Button variant="primary">
          <Check /> Complete
        </Button>
        <Button variant="secondary">
          <Plus /> Add for today
        </Button>
        <Button variant="destructive">
          <Trash2 /> Delete endeavor
        </Button>
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Disabled">
        <Button variant="primary" disabled>
          Start session
        </Button>
        <Button variant="secondary" disabled>
          Reschedule
        </Button>
        <Button variant="destructive" disabled>
          Delete endeavor
        </Button>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · every variant still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Variants">
        <Button variant="primary">Start session</Button>
        <Button variant="secondary">Reschedule</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="destructive">Delete endeavor</Button>
        <Button variant="glass">Focus</Button>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      gradient
      render={(density) => (
        <>
          <Button size={buttonSizeForDensity(density)} variant="primary">
            Start session
          </Button>
          <Button size={buttonSizeForDensity(density)} variant="secondary">
            Reschedule
          </Button>
        </>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Variants.render()}
      {Sizes.render()}
      {WithIcons.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
