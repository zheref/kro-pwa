import { Spinner, SPINNER_SIZES } from './Spinner'
import { colorVar } from '../../system/tokens/roles'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Status/Spinner',
  component: Spinner,
}

const Primary = {
  name: 'Primary · the label says what is processing',
  render: () => (
    <FluentStage>
      <FluentRow label="With a label">
        <Spinner label="Opening session" />
      </FluentRow>
      <FluentRow label="Sizes">
        {SPINNER_SIZES.map((size) => (
          <Spinner key={size} size={size} label={size} />
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const Positions = {
  name: 'Label position',
  render: () => (
    <FluentStage>
      <FluentRow label="After · default">
        <Spinner label="Saving" labelPosition="after" />
      </FluentRow>
      <FluentRow label="Before">
        <Spinner label="Saving" labelPosition="before" />
      </FluentRow>
      <FluentRow label="Above">
        <Spinner label="Saving" labelPosition="above" />
      </FluentRow>
      <FluentRow label="Below">
        <Spinner label="Saving" labelPosition="below" />
      </FluentRow>
    </FluentStage>
  ),
}

const Inverted = {
  name: 'Inverted · on accent glass',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="On the field">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 16,
            borderRadius: 'var(--kro-radius-field)',
            background: colorVar('accent'),
            color: colorVar('onAccent'),
          }}
        >
          <Spinner appearance="inverted" label="Saving" />
        </div>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the sweep still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="In flight">
        <Spinner label="Opening session" />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact medium, comfortable large',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Spinner
          size={density === 'compact' ? 'medium' : 'large'}
          label="Opening session"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Primary.render()}
      {Positions.render()}
      {Inverted.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
