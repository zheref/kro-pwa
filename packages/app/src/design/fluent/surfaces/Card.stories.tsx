import { Card, CardFooter, CardHeader, CardPreview } from './Card'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

export default {
  title: 'Surfaces/Card',
  component: Card,
}

function Sample({
  header = 'Inbox triage',
  description = 'Plan · Task',
}: {
  readonly header?: string
  readonly description?: string
}) {
  return (
    <>
      <CardPreview>
        <div className="flex h-16 items-center justify-center bg-kro-back-inner text-kro-fore-secondary">
          Preview
        </div>
      </CardPreview>
      <CardHeader header={header} description={description} />
      <p className="m-0 text-kro-fore">
        These stay in Inbox until you schedule them.
      </p>
      <CardFooter>Due this afternoon</CardFooter>
    </>
  )
}

const Appearances = {
  name: 'Appearances · fill, outline or none',
  render: () => (
    <FluentStage>
      <FluentRow label="Filled">
        <Card>
          <Sample />
        </Card>
      </FluentRow>
      <FluentRow label="Filled alternative">
        <Card appearance="filled-alternative">
          <Sample header="Weekly review" />
        </Card>
      </FluentRow>
      <FluentRow label="Outline">
        <Card appearance="outline">
          <Sample header="Earn sweep" />
        </Card>
      </FluentRow>
      <FluentRow label="Subtle">
        <Card appearance="subtle">
          <Sample header="Quiet note" />
        </Card>
      </FluentRow>
    </FluentStage>
  ),
}

const Horizontal = {
  name: 'Horizontal · preview beside the body',
  render: () => (
    <FluentStage>
      <FluentRow label="Orientation">
        <Card orientation="horizontal">
          <Sample />
        </Card>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the card still lifts',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Filled">
        <Card>
          <Sample />
        </Card>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact small, comfortable medium',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Card size={fluentSizeForDensity(density)}>
          <Sample />
        </Card>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {Horizontal.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
