import { MessageBar } from './MessageBar'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Status/Message bar',
  component: MessageBar,
}

const Intents = {
  name: 'Intents · the spoken prefix is the signal',
  render: () => (
    <FluentStage>
      <FluentRow label="Info">
        <MessageBar title="This host is read-only." />
      </FluentRow>
      <FluentRow label="Success">
        <MessageBar intent="success" title="Changes saved." />
      </FluentRow>
      <FluentRow label="Warning">
        <MessageBar
          intent="warning"
          title="This endeavor is past its expiry."
          body="It will stop appearing in Do at midnight."
        />
      </FluentRow>
      <FluentRow label="Error">
        <MessageBar
          intent="error"
          title="Google Calendar rejected the change."
          action={{
            label: 'Try again',
            onAction: () => undefined,
          }}
          onDismiss={() => undefined}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const Layouts = {
  name: 'Layouts · single line and wrapping',
  render: () => (
    <FluentStage>
      <FluentRow label="Single line">
        <MessageBar
          title="Sync paused."
          body="You are offline — we will retry when you are back."
        />
      </FluentRow>
      <FluentRow label="Multiline">
        <MessageBar
          layout="multiline"
          intent="warning"
          title="Two hosts disagree about this endeavor."
          body="The copy on Google Calendar was deleted. Kro kept the last known version so you can decide which one to keep."
          action={{
            label: 'Review',
            onAction: () => undefined,
          }}
          onDismiss={() => undefined}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · opaque fills do not move',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="The four intents">
        <MessageBar title="Read-only on this host." />
        <MessageBar intent="success" title="Session closed." />
        <MessageBar intent="warning" title="Past expiry." />
        <MessageBar intent="error" title="Rejected on the host." />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · the bar is the same; the stage shows both',
  render: () => (
    <FluentDensities
      render={() => (
        <MessageBar
          intent="success"
          title="Saved."
          action={{
            label: 'Undo',
            onAction: () => undefined,
          }}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Intents.render()}
      {Layouts.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
