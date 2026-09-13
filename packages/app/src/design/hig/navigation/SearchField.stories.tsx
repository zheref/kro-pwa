import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { SearchField } from './SearchField'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Forms/Search field',
  component: SearchField,
}

const Empty = {
  name: 'Empty · Find endeavors',
  render: () => (
    <HigStage>
      <HigRow label="The glyph is always there">
        <div style={{ width: 360 }}>
          <SearchField
            aria-label="Find endeavors"
            placeholder="Find endeavors"
          />
        </div>
      </HigRow>
    </HigStage>
  ),
}

const WithValue = {
  name: 'With text · Clear appears',
  render: () => (
    <HigStage>
      <HigRow label="Clear is labelled, not a mystery X">
        <div style={{ width: 360 }}>
          <SearchField
            aria-label="Find endeavors"
            placeholder="Find endeavors"
            defaultValue="KroTokens"
          />
        </div>
      </HigRow>
    </HigStage>
  ),
}

const WithCancel = {
  name: 'With Cancel · a way out in words',
  render: () => (
    <HigStage>
      <HigRow label="Cancel beside the field">
        <div style={{ width: 420 }}>
          <SearchField
            aria-label="Find endeavors"
            placeholder="Find endeavors"
            defaultValue="session"
            onCancel={() => {}}
          />
        </div>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the recessed field stays visible',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Find">
        <div style={{ width: '100%' }}>
          <SearchField
            aria-label="Find endeavors"
            placeholder="Find endeavors"
            defaultValue="today"
          />
        </div>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <div style={{ width: 360 }}>
          <SearchField
            density={density}
            aria-label="Find endeavors"
            placeholder="Find endeavors"
            defaultValue="KroTokens"
            onCancel={() => {}}
          />
        </div>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Empty.render()}
      {WithValue.render()}
      {WithCancel.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
