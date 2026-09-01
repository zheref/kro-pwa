/**
 * `SuggestionCard` in both widths, for every source.
 *
 * `Compression` is the story that catches the layout bug: the title must be the
 * last thing to give way and the button must yield first. If a narrow card ever
 * shows "Connect Goo…" beside a comfortable button, the layout priority has
 * been inverted.
 */

import { SuggestionCard, suggestionSources } from './SuggestionCard'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/SuggestionCard',
  component: SuggestionCard,
  parameters: { layout: 'fullscreen' },
}

const COPY = {
  appleReminders: {
    title: 'Apple Reminders',
    subtitle: '5 reminders ready to import',
    actionTitle: 'Import',
  },
  appleCalendar: {
    title: 'Apple Calendar',
    subtitle: 'See your calendar events alongside tasks.',
    actionTitle: 'Connect',
  },
  googleCalendar: {
    title: 'Google Calendar',
    subtitle: 'See all your events in one place.',
    actionTitle: 'Connect',
  },
  aiProposal: {
    title: 'Rearrange your afternoon',
    subtitle: 'Move the grocery run before the 5pm block.',
    actionTitle: 'Apply',
  },
} as const

export const EverySource = {
  name: 'Every source · carousel width',
  render: () => (
    <Stage gradient>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {suggestionSources.map((source) => (
          <SuggestionCard
            key={source}
            model={{ ...COPY[source], source }}
            onAction={() => undefined}
          />
        ))}
      </div>
    </Stage>
  ),
}

export const BannerWidth = {
  name: 'fillsWidth · the Plan tab banner',
  render: () => (
    <Stage gradient>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
        }}
      >
        <SuggestionCard
          model={{ ...COPY.googleCalendar, source: 'googleCalendar' }}
          fillsWidth
          onAction={() => undefined}
        />
        <SuggestionCard
          model={{
            ...COPY.googleCalendar,
            subtitle: 'Opening Google in a new tab…',
            source: 'googleCalendar',
          }}
          fillsWidth
          isActionDisabled
          onAction={() => undefined}
        />
      </div>
    </Stage>
  ),
}

export const Compression = {
  name: 'Compression · the title yields last',
  render: () => (
    <Stage gradient>
      {[340, 280, 240, 200].map((width) => (
        <Cell key={width} label={`${width}px`}>
          <div style={{ width }}>
            <SuggestionCard
              model={{ ...COPY.googleCalendar, source: 'googleCalendar' }}
              fillsWidth
              onAction={() => undefined}
            />
          </div>
        </Cell>
      ))}
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <SuggestionCard
        model={{ ...COPY.appleReminders, source: 'appleReminders' }}
        fillsWidth
        onAction={() => undefined}
      />
    </BothSchemes>
  ),
}
