import { buttonSizeForDensity } from '../../system/density'
import { Button } from '../../system/primitives/button'
import { HigDensities, HigStage } from '../higStoryStage'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  Alert,
  AlertActions,
  AlertContent,
  AlertDescription,
  AlertTitle,
  AlertTrigger,
} from './Alert'

export default {
  title: 'Surfaces/Alert',
  component: AlertContent,
  parameters: { layout: 'centered' },
}

const Confirm = {
  name: 'Confirm · start this session',
  render: () => (
    <HigStage>
      <Alert>
        <AlertTrigger asChild>
          <Button variant="primary">Start this session</Button>
        </AlertTrigger>
        <AlertContent>
          <AlertTitle>Start this session?</AlertTitle>
          <AlertDescription>
            Twenty-five minutes against Write the KroTokens port. The timer
            begins the moment you confirm.
          </AlertDescription>
          <AlertActions>
            <Button variant="secondary">Not now</Button>
            <Button variant="primary">Start session</Button>
          </AlertActions>
        </AlertContent>
      </Alert>
    </HigStage>
  ),
}

const Destructive = {
  name: 'Destructive · the action is named, not just red',
  render: () => (
    <HigStage>
      <Alert>
        <AlertTrigger asChild>
          <Button variant="destructive">Delete endeavor</Button>
        </AlertTrigger>
        <AlertContent>
          <AlertTitle>Delete “Write the KroTokens port”?</AlertTitle>
          <AlertDescription>
            Its three logged sessions and 240 points go with it. This cannot be
            undone.
          </AlertDescription>
          <AlertActions>
            <Button variant="secondary">Keep it</Button>
            <Button variant="destructive">Delete endeavor</Button>
          </AlertActions>
        </AlertContent>
      </Alert>
    </HigStage>
  ),
}

const DarkScheme = {
  name: 'Dark · the choice still reads',
  render: () => (
    <HigStage theme="dark">
      <Alert>
        <AlertTrigger asChild>
          <Button variant="primary">Leave this session</Button>
        </AlertTrigger>
        <AlertContent>
          <AlertTitle>Leave this session?</AlertTitle>
          <AlertDescription>
            Twelve minutes are already on the clock. Leaving keeps the log.
          </AlertDescription>
          <AlertActions>
            <Button variant="secondary">Stay</Button>
            <Button variant="primary">Leave session</Button>
          </AlertActions>
        </AlertContent>
      </Alert>
    </HigStage>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <AlertActions density={density}>
          <Button variant="secondary" size={buttonSizeForDensity(density)}>
            Not now
          </Button>
          <Button variant="primary" size={buttonSizeForDensity(density)}>
            Start session
          </Button>
        </AlertActions>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Confirm.render()}
      {Destructive.render()}
      {DarkScheme.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
