'use client'

/**
 * The Duration profile — the port of
 * `Kro/Application/EndeavorDetail/EndeavorDurationView.swift` (`RC-15`).
 *
 * Three optional bounds the user authors, over one number the app **observes**.
 * Canon's order, kept: the observed card first (so the recommendation is read
 * before a preference is set against it), then the validation message, then
 * Preferred, Minimum, Maximum.
 *
 * ## The observed card is read-only, and that is the whole point
 *
 * `#29`'s `EndeavorDuration` header states canon's reason verbatim: the
 * empirical history *prefills* the drafts, and enabling a bound is an explicit
 * act, so the observation is never written back. Nothing in this Fragment can
 * write it — there is no control on that card at all, and below the sample
 * minimum it says how many sessions are still needed rather than averaging one
 * data point.
 *
 * ## The dial is the chrome kit's, at canon's own geometry
 *
 * `DurationDial` is a real `role="slider"` with arrow-key stepping, so the
 * three bounds are keyboard-operable without a second numeric field beside each
 * one. Its `maxSeconds` is raised past the kit's 60-minute session default,
 * because a *task's* preferred duration is not a focus session's and canon's
 * bounds are unbounded above.
 */
import type { TimeIntervalSeconds } from '@kro/core'
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import { SectionCard } from '../../../design/endeavor/SurfaceCard'
import { formatDuration } from '../../../design/endeavor/formatting'
import { DurationDial } from '../../../design/chrome/dial/DurationDial'
import { colorVar } from '../../../design/system/tokens/roles'
import type {
  DurationBound,
  EndeavorDurationDraft,
  ObservedFocusTime,
} from '../EndeavorDuration'
import { HIDDEN_SCROLLBAR_STYLE } from './EndeavorDetailFragment'

/** Four hours. A preferred duration is not capped at one focus session. */
export const DURATION_MAX_SECONDS = 4 * 60 * 60

interface BoundRow {
  readonly bound: DurationBound
  readonly title: string
  readonly explanation: string
  readonly seconds: TimeIntervalSeconds
  readonly isEnabled: boolean
}

export interface EndeavorDurationFragmentProps {
  readonly draft: EndeavorDurationDraft
  readonly observed: ObservedFocusTime
  /** Canon's `validationMessage` — `null` when the profile is coherent. */
  readonly validationMessage: string | null
  readonly isSaving: boolean
  readonly onToggleBound: (bound: DurationBound, isEnabled: boolean) => void
  readonly onAdjustBound: (bound: DurationBound, seconds: number) => void
}

export function EndeavorDurationFragment({
  draft,
  observed,
  validationMessage,
  isSaving,
  onToggleBound,
  onAdjustBound,
}: EndeavorDurationFragmentProps) {
  const rows: readonly BoundRow[] = [
    {
      bound: 'preferred',
      title: 'Preferred duration',
      explanation: 'Used before the empirical recommendation.',
      seconds: draft.preferredSeconds,
      isEnabled: draft.isPreferredEnabled,
    },
    {
      bound: 'minimum',
      title: 'Minimum duration',
      explanation: 'Optional lower bound for the empirical average.',
      seconds: draft.minimumSeconds,
      isEnabled: draft.isMinimumEnabled,
    },
    {
      bound: 'maximum',
      title: 'Maximum duration',
      explanation: 'Optional upper bound for the empirical average.',
      seconds: draft.maximumSeconds,
      isEnabled: draft.isMaximumEnabled,
    },
  ]

  return (
    <div
      data-testid="endeavor-duration"
      className="flex min-h-0 flex-1 flex-col gap-kro-large overflow-y-auto pb-kro-x-large [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden"
      style={HIDDEN_SCROLLBAR_STYLE}
    >
      <SectionCard title="Observed focus time" icon="clock.arrow.circlepath">
        {observed.seconds === null ? (
          <p
            data-testid="observed-locked"
            className="m-0 text-sm"
            style={{ color: colorVar('foreSecondary') }}
          >
            {`Complete at least ${observed.requiredSampleCount} focus sessions to unlock an empirical recommendation.`}
          </p>
        ) : (
          <div className="flex flex-col gap-kro-small">
            <p
              data-testid="observed-average"
              className="m-0 font-semibold text-xl"
              style={{ color: colorVar('fore') }}
            >
              {formatDuration(observed.seconds)}
            </p>
            <p
              className="m-0 text-sm"
              style={{ color: colorVar('foreSecondary') }}
            >
              {`Average of ${observed.sampleCount} completed focus sessions, rounded to the nearest minute.`}
            </p>
          </div>
        )}
      </SectionCard>

      {validationMessage === null ? null : (
        <InlineBanner kind="warning" message={validationMessage} />
      )}

      {rows.map((row) => (
        <SectionCard key={row.bound} title={row.title} icon="timer">
          <div className="flex flex-col gap-kro-medium">
            <label
              className="flex items-center gap-kro-small text-sm"
              style={{ color: colorVar('fore') }}
            >
              <input
                type="checkbox"
                checked={row.isEnabled}
                disabled={isSaving}
                data-duration-toggle={row.bound}
                onChange={(event) =>
                  onToggleBound(row.bound, event.target.checked)
                }
                className="size-5 accent-[var(--kro-color-accent)]"
              />
              {`Use ${row.title.toLowerCase()}`}
            </label>

            <p
              className="m-0 text-sm"
              style={{ color: colorVar('foreSecondary') }}
            >
              {row.explanation}
            </p>

            {row.isEnabled ? (
              <DurationDial
                seconds={row.seconds}
                maxSeconds={DURATION_MAX_SECONDS}
                diameter={148}
                label={row.title}
                readOnly={isSaving}
                onChange={(seconds) => onAdjustBound(row.bound, seconds)}
              />
            ) : null}
          </div>
        </SectionCard>
      ))}
    </div>
  )
}
