import { Button, buttonSizeForDensity } from '../../system/primitives/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../../system/primitives/sheet'
import { HigDensities, HigStage } from '../higStoryStage'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'HIG/Presentation/Sheets',
  component: SheetContent,
  parameters: { layout: 'fullscreen' },
}

function Items() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {['Reply to Ana', 'Book the flight', 'Read the RC handbook'].map(
        (title) => (
          <div
            key={title}
            style={{
              padding: 'var(--kro-space-medium)',
              borderRadius: 'var(--kro-radius-field)',
              background: 'var(--kro-color-back-inner)',
              color: 'var(--kro-color-fore)',
            }}
          >
            {title}
          </div>
        ),
      )}
    </div>
  )
}

const Bottom = {
  name: 'Bottom · the default, where a thumb reaches',
  render: () => (
    <HigStage gradient>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="primary">Open inbox</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Inbox</SheetTitle>
          <SheetDescription>Three items to triage.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </HigStage>
  ),
}

const Right = {
  name: 'Right · the desktop drawer',
  render: () => (
    <HigStage>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">Visibility</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetTitle>Visibility</SheetTitle>
          <SheetDescription>What shows in My Day.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </HigStage>
  ),
}

const DarkScheme = {
  name: 'Dark · the sheet stays glass',
  render: () => (
    <HigStage theme="dark" gradient>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="primary">Open inbox</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Inbox</SheetTitle>
          <SheetDescription>Three items to triage.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </HigStage>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Sheet>
          <SheetTrigger asChild>
            <Button size={buttonSizeForDensity(density)} variant="primary">
              Open inbox
            </Button>
          </SheetTrigger>
        </Sheet>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Bottom.render()}
      {Right.render()}
      {DarkScheme.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
