/**
 * The suggestions pane above the desktop capture prompt, in the states its
 * selection can be in. `CaptureSuggestionsFragment.test.tsx` mirrors this set
 * one for one (`RC-11`); every card comes from the ported catalogue.
 */
import { CAPTURE_SUGGESTIONS } from '../CaptureSuggestions'
import { CAPTURE_MOCK_NOW, captureSuggestionMocks } from '../CaptureMocks'
import { CaptureSuggestionsFragment } from './CaptureSuggestionsFragment'
import { ThemeScope } from './__tests__/captureHarness'

export default {
  title: 'Capture/Suggestions',
  component: CaptureSuggestionsFragment,
}

const noop = () => {}

/** Nothing ticked — the action reads a neutral "Select to add", never 0. */
export const NothingSelected = {
  render: () => (
    <ThemeScope theme="light">
      <div style={{ width: 680, height: 360, padding: 16 }}>
        <CaptureSuggestionsFragment
          suggestions={CAPTURE_SUGGESTIONS}
          selectedIds={[]}
          inboxCount={0}
          revealChord={false}
          now={CAPTURE_MOCK_NOW}
          onPick={noop}
          onToggle={noop}
          onAddSelected={noop}
        />
      </div>
    </ThemeScope>
  ),
}

/** Two cards ticked — "Add 2" is armed, ⇧⏎ hinted. */
export const TwoSelected = {
  render: () => (
    <ThemeScope theme="dark">
      <div style={{ width: 680, height: 360, padding: 16 }}>
        <CaptureSuggestionsFragment
          suggestions={CAPTURE_SUGGESTIONS}
          selectedIds={[
            captureSuggestionMocks.task.id,
            captureSuggestionMocks.reminder.id,
          ]}
          inboxCount={2}
          revealChord={false}
          now={CAPTURE_MOCK_NOW}
          onPick={noop}
          onToggle={noop}
          onAddSelected={noop}
        />
      </div>
    </ThemeScope>
  ),
}

/** Option held — the ⌥S keycap floats over the header; every kind, events too, can be ticked. */
export const OptionHeldWithEvents = {
  render: () => (
    <ThemeScope theme="light">
      <div style={{ width: 680, height: 360, padding: 16 }}>
        <CaptureSuggestionsFragment
          suggestions={[
            captureSuggestionMocks.eventSoon,
            captureSuggestionMocks.eventTomorrow,
            captureSuggestionMocks.longUnicode,
            captureSuggestionMocks.habit,
          ]}
          selectedIds={[]}
          inboxCount={0}
          revealChord
          now={CAPTURE_MOCK_NOW}
          onPick={noop}
          onToggle={noop}
          onAddSelected={noop}
        />
      </div>
    </ThemeScope>
  ),
}
