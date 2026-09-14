import { Label } from './Label'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Forms/Label',
  component: Label,
}

const Tones = {
  name: 'Tones · primary, secondary, destructive in words',
  render: () => (
    <HigStage>
      <HigRow label="Primary">
        <Label>Session title</Label>
      </HigRow>
      <HigRow label="Secondary">
        <Label tone="secondary">Plan · Task</Label>
      </HigRow>
      <HigRow label="Destructive">
        <Label tone="destructive">Delete this endeavor</Label>
      </HigRow>
    </HigStage>
  ),
}

const SizesAndAs = {
  name: 'Sizes · 13px caption, 15px name',
  render: () => (
    <HigStage>
      <HigRow label="Small">
        <Label size="sm" tone="secondary" as="p">
          Today
        </Label>
      </HigRow>
      <HigRow label="Medium">
        <Label size="md" htmlFor="endeavor-title">
          Endeavor title
        </Label>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · destructive still names the action',
  render: () => (
    <HigBothSchemes>
      <HigRow label="On both schemes">
        <Label>Weekly review</Label>
        <Label tone="secondary">Do</Label>
        <Label tone="destructive">Archive this endeavor</Label>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <>
          <Label density={density}>Session title</Label>
          <Label density={density} tone="secondary">
            Plan · Task
          </Label>
        </>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Tones.render()}
      {SizesAndAs.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
