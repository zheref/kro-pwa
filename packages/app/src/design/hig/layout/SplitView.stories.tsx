import { List, ListRow, ListSection } from './List'
import { SplitView } from './SplitView'
import { HigBothSchemes, HigDensities, HigStage } from '../higStoryStage'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Layout/Split view',
  component: SplitView,
}

function EndeavorDetail() {
  return (
    <div className="flex flex-col gap-kro-small p-kro-medium">
      <h2 className="m-0 text-[17px] font-semibold text-kro-fore">
        Inbox triage
      </h2>
      <p className="m-0 text-[13px] text-kro-fore-secondary">Plan · Task</p>
      <p className="m-0 text-kro-fore">
        Clear the Inbox, then schedule what belongs in Do. Complete with a
        session when the pile is real work.
      </p>
    </div>
  )
}

const ListAndDetail = {
  name: 'List and detail · endeavors beside the note',
  render: () => (
    <HigStage>
      <SplitView
        className="h-[280px] w-full overflow-hidden rounded-kro-card bg-kro-absolute"
        leading={
          <List>
            <ListSection header="Plan">
              <ListRow title="Inbox triage" selected />
              <ListRow title="Weekly review" />
              <ListRow title="Morning run" />
            </ListSection>
          </List>
        }
        trailing={<EndeavorDetail />}
      />
    </HigStage>
  ),
}

const NarrowLeading = {
  name: 'Narrow leading · 200px Plan column',
  render: () => (
    <HigStage>
      <SplitView
        leadingWidth="200px"
        className="h-[240px] w-full"
        leading={<p className="p-kro-medium">Plan</p>}
        trailing={<p className="p-kro-medium">Do · today's session</p>}
      />
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the hairline still splits the task',
  render: () => (
    <HigBothSchemes>
      <SplitView
        className="h-[200px] w-full"
        leading={<p className="p-kro-medium">Earn</p>}
        trailing={<p className="p-kro-medium">Session points</p>}
      />
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <SplitView
          density={density}
          className="h-[160px] w-full"
          leading={<p className="p-kro-medium">Plan</p>}
          trailing={<p className="p-kro-medium">Do · today's session</p>}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {ListAndDetail.render()}
      {NarrowLeading.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
