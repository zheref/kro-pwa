import { BothSchemes, Stage } from '../Stage'
import { DEFAULT_DURATION_PRESETS, DurationDial } from './DurationDial'

/**
 * DurationDial — drag the rim, or pick a preset.
 *
 * WHAT TO LOOK FOR. The tick ring is 18px thick and fills clockwise from 12
 * o'clock; the inner disc carries the same fill at a lower opacity; the readout
 * is `MM:SS` in tabular figures so it does not jitter as it changes. The preset
 * pills are canon's six — 15 / 20 / 25 / 45 / 60 / 90 — and the one matching
 * the current duration is filled rather than outlined.
 *
 * TRY THE KEYBOARD. Tab to the dial and hold an arrow key: one minute a step,
 * five on Page Up/Down, the ends on Home/End. Tab again and the presets are
 * ordinary buttons. Nothing here needs a pointer.
 *
 * THE 90-MINUTE STORY IS THE INTERESTING ONE. Canon's presets run to 90 minutes
 * and canon's dial only sweeps 60, so the ring closes while the readout keeps
 * counting. That is canon's own tension, shown rather than papered over; the
 * last story is the same dial with the sweep widened to match.
 */
export default {
  title: 'Design system/Chrome/DurationDial',
  component: DurationDial,
  parameters: { layout: 'fullscreen' },
}

function Centre({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 24,
      }}
    >
      {children}
    </div>
  )
}

export const Pomodoro = {
  name: 'A 25-minute pomodoro, both schemes',
  render: () => (
    <BothSchemes height={420}>
      {() => (
        <Centre>
          <DurationDial seconds={25 * 60} />
        </Centre>
      )}
    </BothSchemes>
  ),
}

export const AcrossTheRange = {
  name: 'Across the range — 0, 15, 45, 60 minutes',
  render: () => (
    <Stage height={340} label="Arc from empty to closed">
      <Centre>
        {[0, 15, 45, 60].map((minutes) => (
          <DurationDial
            key={minutes}
            seconds={minutes * 60}
            presets={[]}
            diameter={130}
            readOnly
          />
        ))}
      </Centre>
    </Stage>
  ),
}

export const Presets = {
  name: `Preset pills — canon's ${DEFAULT_DURATION_PRESETS.join(' / ')}`,
  render: () => (
    <BothSchemes height={420}>
      {() => (
        <Centre>
          <DurationDial seconds={45 * 60} />
        </Centre>
      )}
    </BothSchemes>
  ),
}

export const BetweenPresets = {
  name: 'Between presets — no pill is selected',
  render: () => (
    <Stage height={420} label="33 minutes">
      <Centre>
        <DurationDial seconds={33 * 60} />
      </Centre>
    </Stage>
  ),
}

export const NinetyMinutes = {
  name: 'The 90-minute preset — closed arc, honest readout',
  render: () => (
    <Stage theme="dark" height={420} label="Canon's dial only sweeps 60">
      <Centre>
        <DurationDial seconds={90 * 60} />
        <DurationDial seconds={90 * 60} maxSeconds={90 * 60} presets={[]} />
      </Centre>
    </Stage>
  ),
}

export const ReadOnly = {
  name: 'Read-only — canon`s staticDuration form',
  render: () => (
    <Stage height={420} label="Not focusable, not draggable">
      <Centre>
        <DurationDial seconds={15 * 60} readOnly />
      </Centre>
    </Stage>
  ),
}
