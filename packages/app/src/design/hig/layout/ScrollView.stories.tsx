import { ScrollView } from './ScrollView'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Layout/Scroll view',
  component: ScrollView,
}

const ROWS = [
  'Inbox triage',
  'Weekly review',
  'Morning run',
  'Deep work',
  'Admin sweep',
  'Earn sweep',
  'Blueprint: launch kit',
  'Focus sounds',
] as const

const TallStack = {
  name: 'Tall stack · clipped to 240px',
  render: () => (
    <HigStage>
      <ScrollView
        aria-label="Today's endeavors"
        className="h-[240px] w-full rounded-kro-card bg-kro-absolute"
      >
        {ROWS.map((row) => (
          <div
            key={row}
            className="flex min-h-6 items-center border-b border-kro-hairline px-kro-medium"
          >
            {row}
          </div>
        ))}
      </ScrollView>
    </HigStage>
  ),
}

const Horizontal = {
  name: 'Horizontal · Plan, Do, Earn as lanes',
  render: () => (
    <HigStage>
      <HigRow label="Lanes">
        <ScrollView axis="horizontal" aria-label="Areas" className="w-full">
          <div className="flex gap-kro-small">
            {['Plan', 'Do', 'Earn', 'Review', 'Hosts'].map((lane) => (
              <div
                key={lane}
                className="flex h-6 min-w-[140px] items-center justify-center rounded-kro-field bg-kro-back-next"
              >
                {lane}
              </div>
            ))}
          </div>
        </ScrollView>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the clip still holds',
  render: () => (
    <HigBothSchemes>
      <ScrollView
        aria-label="Sessions"
        className="h-[160px] w-full rounded-kro-card bg-kro-absolute"
      >
        {ROWS.slice(0, 6).map((row) => (
          <div key={row} className="flex min-h-6 items-center px-kro-medium">
            {row}
          </div>
        ))}
      </ScrollView>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <ScrollView
          density={density}
          aria-label="Today's endeavors"
          className="h-[160px] w-full rounded-kro-card bg-kro-absolute"
        >
          {ROWS.slice(0, 4).map((row) => (
            <div
              key={row}
              className={
                density === 'compact'
                  ? 'flex min-h-6 items-center border-b border-kro-hairline px-kro-medium'
                  : 'flex min-h-9 items-center border-b border-kro-hairline px-kro-medium'
              }
            >
              {row}
            </div>
          ))}
        </ScrollView>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {TallStack.render()}
      {Horizontal.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
