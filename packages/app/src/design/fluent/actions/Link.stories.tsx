import { Link } from './Link'
import { StoryGallery } from '../../storybook/storyGallery'
import { FluentBothSchemes, FluentRow, FluentStage } from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Actions/Link',
  component: Link,
}

const Appearances = {
  name: 'Appearances · accent underline, or subtle until hover',
  render: () => (
    <FluentStage>
      <FluentRow label="Default">
        <Link href="/plan">Open the plan</Link>
      </FluentRow>
      <FluentRow label="Subtle">
        <Link href="/plan" appearance="subtle">
          Learn more
        </Link>
      </FluentRow>
    </FluentStage>
  ),
}

const Inline = {
  name: 'Inline · inherits the surrounding copy',
  render: () => (
    <FluentStage>
      <FluentRow label="In a sentence">
        <span>
          See the{' '}
          <Link href="/plan" inline>
            plan
          </Link>{' '}
          for today, or{' '}
          <Link href="/earn" appearance="subtle" inline>
            how earning works
          </Link>
          .
        </span>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Locked">
        <Link href="/plan" disabled>
          Open the plan
        </Link>
        <Link appearance="subtle" disabled>
          Retry
        </Link>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the word is still the signal',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Default and subtle">
        <Link href="/plan">Open the plan</Link>
        <Link href="/plan" appearance="subtle">
          Learn more
        </Link>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {Inline.render()}
      {Disabled.render()}
      {BothSchemes.render()}
    </StoryGallery>
  ),
}
