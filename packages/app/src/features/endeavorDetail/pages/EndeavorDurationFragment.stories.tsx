/**
 * The Duration profile's visual evidence (`RC-11`, `UZF-26`).
 *
 * Canon's own three previews, plus both schemes: no history (the
 * recommendation is locked), an empirical recommendation with all three bounds
 * enabled, and an incoherent profile whose validation message says so.
 */
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import {
  durationDraftFor,
  durationValidationMessage,
  observedFocusTime,
} from '../EndeavorDuration'
import { EndeavorDurationFragment } from './EndeavorDurationFragment'

const noop = () => {}

const scene = (
  endeavor: (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks],
) => {
  const draft = durationDraftFor(endeavor)
  return {
    draft,
    observed: observedFocusTime(endeavor),
    validationMessage: durationValidationMessage(draft),
    isSaving: false,
    onToggleBound: noop,
    onAdjustBound: noop,
  }
}

export default {
  title: 'Endeavor Detail/Duration',
  component: EndeavorDurationFragment,
  parameters: { layout: 'fullscreen' },
}

/** One session logged — below the sample minimum, so the card stays locked. */
export const NoRecommendationYet = {
  render: () => (
    <Stage width={430}>
      <EndeavorDurationFragment
        {...scene(detailEndeavorMocks.taskWithOneSession)}
      />
    </Stage>
  ),
}

/** Three qualifying sessions — the observed average is unlocked and read-only. */
export const EmpiricalRecommendation = {
  render: () => (
    <Stage width={430}>
      <EndeavorDurationFragment
        {...scene(detailEndeavorMocks.taskWithSessions)}
        draft={{
          ...durationDraftFor(detailEndeavorMocks.taskWithSessions),
          isPreferredEnabled: true,
          isMinimumEnabled: true,
          isMaximumEnabled: true,
          minimumSeconds: 20 * 60,
          maximumSeconds: 45 * 60,
        }}
      />
    </Stage>
  ),
}

/** A minimum above the maximum — canon's one validation rule, stated. */
export const InvalidBounds = {
  render: () => {
    const draft = {
      ...durationDraftFor(detailEndeavorMocks.taskWithSessions),
      isMinimumEnabled: true,
      isMaximumEnabled: true,
      minimumSeconds: 60 * 60,
      maximumSeconds: 20 * 60,
    }
    return (
      <Stage width={430}>
        <EndeavorDurationFragment
          {...scene(detailEndeavorMocks.taskWithSessions)}
          draft={draft}
          validationMessage={durationValidationMessage(draft)}
        />
      </Stage>
    )
  },
}

/** A save in flight: the dials go read-only rather than disappearing. */
export const Saving = {
  render: () => (
    <Stage width={430}>
      <EndeavorDurationFragment
        {...scene(detailEndeavorMocks.taskWithSessions)}
        draft={{
          ...durationDraftFor(detailEndeavorMocks.taskWithSessions),
          isPreferredEnabled: true,
        }}
        isSaving
      />
    </Stage>
  ),
}

/** Both schemes, so the dial's ticks and the cards are judged in dark too. */
export const BothColorSchemes = {
  render: () => (
    <BothSchemes>
      <EndeavorDurationFragment
        {...scene(detailEndeavorMocks.taskWithSessions)}
      />
    </BothSchemes>
  ),
}
