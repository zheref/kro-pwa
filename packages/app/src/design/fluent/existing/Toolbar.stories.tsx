import { Info, Plus } from 'lucide-react'
import { Button } from '../../system/primitives/button'
import { Toolbar } from '../../hig/navigation/Toolbar'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Navigation/Toolbar',
  component: Toolbar,
}

const Default = {
  name: 'Grouped actions for the current view',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Compose and info">
        <Toolbar
          groups={[
            [
              <Button
                key="add"
                variant="ghost"
                size="icon-sm"
                aria-label="Add endeavor"
              >
                <Plus />
              </Button>,
            ],
            [
              <Button
                key="info"
                variant="ghost"
                size="icon-sm"
                aria-label="About this day"
              >
                <Info />
              </Button>,
            ],
          ]}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled action · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Add is locked">
        <Toolbar
          groups={[
            [
              <Button
                key="add"
                variant="ghost"
                size="icon-sm"
                aria-label="Add endeavor"
                disabled
              >
                <Plus />
              </Button>,
            ],
          ]}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Compose">
        <Toolbar
          groups={[
            [
              <Button
                key="add"
                variant="ghost"
                size="icon-sm"
                aria-label="Add endeavor"
              >
                <Plus />
              </Button>,
            ],
          ]}
        />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      gradient
      render={(density) => (
        <Toolbar
          density={density}
          groups={[
            [
              <Button
                key="add"
                variant="ghost"
                size="icon-sm"
                aria-label="Add endeavor"
              >
                <Plus />
              </Button>,
            ],
          ]}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
