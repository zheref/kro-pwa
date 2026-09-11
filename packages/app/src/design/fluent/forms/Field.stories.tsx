import { Field } from './Field'
import { StoryGallery } from '../../storybook/storyGallery'
import { Input } from '../../system/primitives/input'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Forms/Field',
  component: Field,
}

const Named = {
  name: 'Label, hint, control',
  render: () => (
    <FluentStage>
      <FluentRow label="A title plus a recessed field">
        <Field label="Session title" hint="What needs doing in this block?">
          <Input placeholder="Write the launch note" />
        </Field>
      </FluentRow>
    </FluentStage>
  ),
}

const RequiredAndInvalid = {
  name: 'Required and invalid · the words are the signal',
  render: () => (
    <FluentStage>
      <FluentRow label="Required mark">
        <Field label="Session title" required>
          <Input />
        </Field>
      </FluentRow>
      <FluentRow label="Error">
        <Field
          label="Session title"
          required
          validationState="error"
          validationMessage="A title is required before this can be saved."
        >
          <Input aria-invalid />
        </Field>
      </FluentRow>
      <FluentRow label="Warning">
        <Field
          label="Host"
          validationState="warning"
          validationMessage="This host is read-only."
        >
          <Input defaultValue="Google Calendar" />
        </Field>
      </FluentRow>
      <FluentRow label="Success">
        <Field
          label="Session title"
          validationState="success"
          validationMessage="Saved to the plan."
        >
          <Input defaultValue="Write the launch note" />
        </Field>
      </FluentRow>
    </FluentStage>
  ),
}

const Horizontal = {
  name: 'Horizontal · label beside the control',
  render: () => (
    <FluentStage>
      <FluentRow label="Orientation">
        <Field label="When" orientation="horizontal">
          <Input type="date" defaultValue="2026-09-11" />
        </Field>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the message still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="On the indigoGrape field">
        <Field
          label="Session title"
          validationState="error"
          validationMessage="A title is required before this can be saved."
        >
          <Input aria-invalid />
        </Field>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Field
          size={fluentSizeForDensity(density)}
          label="Session title"
          hint="What needs doing?"
        >
          <Input density={density} placeholder="Write the launch note" />
        </Field>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Named.render()}
      {RequiredAndInvalid.render()}
      {Horizontal.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
