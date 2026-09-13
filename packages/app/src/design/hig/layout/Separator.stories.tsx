import { List, ListRow } from './List'
import { Separator } from './Separator'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Layout/Separator',
  component: Separator,
}

const Hairline = {
  name: 'Hairline · a 1px rule',
  render: () => (
    <HigStage>
      <div className="w-full">
        <p className="m-0 pb-kro-small text-kro-fore">Inbox triage</p>
        <Separator />
        <p className="m-0 pt-kro-small text-kro-fore">Weekly review</p>
      </div>
    </HigStage>
  ),
}

const Labeled = {
  name: 'Labeled · the words name the group',
  render: () => (
    <HigStage>
      <HigRow label="In a list">
        <div className="w-full">
          <List>
            <ListRow title="Inbox triage" />
            <ListRow title="Weekly review" />
          </List>
          <Separator label="Today's sessions" className="my-kro-medium" />
          <List>
            <ListRow title="Deep work" />
            <ListRow title="Earn sweep" />
          </List>
        </div>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the hairline still reads',
  render: () => (
    <HigBothSchemes>
      <Separator label="Earn" />
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Separator density={density} label="Today's sessions" />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Hairline.render()}
      {Labeled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
