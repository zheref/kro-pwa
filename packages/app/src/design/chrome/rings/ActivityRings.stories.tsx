import { useState } from 'react'
import { BothSchemes, Stage } from '../Stage'
import { ActivityRings, dayProgressRings } from './ActivityRings'

/**
 * ActivityRings — the Day Progress Rings truth table.
 *
 * WHAT TO LOOK FOR. Gold outside for habits, emerald inside for tasks, each arc
 * starting at 12 o'clock and running clockwise over a faint track of its own
 * colour. Round caps, and the rendered outer edge landing exactly on the
 * requested diameter — the arcs must not overflow the box they sit in.
 *
 * THE ROW THAT MATTERS IS "TASKS ONLY". A day with no habits shows a SINGLE
 * emerald ring at full size — not a full-size empty gold track with an emerald
 * ring inside it. An empty gold track would say "you've done none of your
 * habits" on a day that asked for none, and that is the reading the rule exists
 * to prevent.
 *
 * Under `prefers-reduced-motion: reduce` a change takes its new value without
 * sweeping. Toggle it in the OS and use the "Animated transition" story.
 */
export default {
  title: 'Design system/Chrome/ActivityRings',
  component: ActivityRings,
  parameters: { layout: 'fullscreen' },
}

function Cell({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        minWidth: 130,
      }}
    >
      {children}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
          color: 'rgb(255 255 255 / 0.95)',
        }}
      >
        {caption}
      </span>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 24,
      }}
    >
      {children}
    </div>
  )
}

export const TruthTable = {
  name: 'Truth table — every row of DayProgressRings.md § States',
  render: () => (
    <Stage
      height={320}
      label="Nothing expected · habits only · tasks only · both · both complete"
    >
      <Row>
        <Cell caption="Nothing expected — no rings">
          <ActivityRings
            rings={dayProgressRings({
              habits: { completed: 0, expected: 0 },
              tasks: { completed: 0, expected: 0 },
            })}
            diameter={72}
            lineWidth={9}
            spacing={4}
          />
        </Cell>
        <Cell caption="Habits only — one gold">
          <ActivityRings
            rings={dayProgressRings({
              habits: { completed: 2, expected: 4 },
              tasks: { completed: 0, expected: 0 },
            })}
            diameter={72}
            lineWidth={9}
            spacing={4}
          />
        </Cell>
        <Cell caption="Tasks only — one emerald, FULL size">
          <ActivityRings
            rings={dayProgressRings({
              habits: { completed: 0, expected: 0 },
              tasks: { completed: 2, expected: 5 },
            })}
            diameter={72}
            lineWidth={9}
            spacing={4}
          />
        </Cell>
        <Cell caption="Both, partly done">
          <ActivityRings
            rings={dayProgressRings({
              habits: { completed: 3, expected: 5 },
              tasks: { completed: 1, expected: 4 },
            })}
            diameter={72}
            lineWidth={9}
            spacing={4}
          />
        </Cell>
        <Cell caption="Both complete">
          <ActivityRings
            rings={dayProgressRings({
              habits: { completed: 5, expected: 5 },
              tasks: { completed: 4, expected: 4 },
            })}
            diameter={72}
            lineWidth={9}
            spacing={4}
          />
        </Cell>
      </Row>
    </Stage>
  ),
}

export const NoDenominatorIsAbsent = {
  name: 'No denominator — absent, never an empty gold track',
  render: () => (
    <Stage
      theme="dark"
      height={300}
      label="Left: what ships. Right: the mistake it prevents."
    >
      <Row>
        <Cell caption="A habit-less day — one emerald ring">
          <ActivityRings
            rings={dayProgressRings({
              habits: { completed: 0, expected: 0 },
              tasks: { completed: 3, expected: 5 },
            })}
            diameter={88}
            lineWidth={11}
            spacing={5}
          />
        </Cell>
        <Cell caption="WRONG — a gold track saying you did none of nothing">
          <ActivityRings
            rings={[
              {
                id: 'habits',
                progress: 0,
                role: 'ringGold',
                accessibilityLabel: 'Habits, none complete',
              },
              {
                id: 'tasks',
                progress: 0.6,
                role: 'ringEmerald',
                accessibilityLabel: 'Tasks, 3 of 5 complete',
              },
            ]}
            diameter={88}
            lineWidth={11}
            spacing={5}
          />
        </Cell>
      </Row>
    </Stage>
  ),
}

export const BothSchemesAtHeaderSize = {
  name: 'Both schemes, at the Do header`s 44px',
  render: () => (
    <BothSchemes height={220}>
      {() => (
        <Row>
          <Cell caption="Default 44px">
            <ActivityRings
              rings={dayProgressRings({
                habits: { completed: 3, expected: 5 },
                tasks: { completed: 1, expected: 4 },
              })}
            />
          </Cell>
          <Cell caption="Tasks only, 44px">
            <ActivityRings
              rings={dayProgressRings({ tasks: { completed: 2, expected: 5 } })}
            />
          </Cell>
        </Row>
      )}
    </BothSchemes>
  ),
}

export const AnimatedTransition = {
  name: 'Animated transition — the arc sweeps, unless motion is reduced',
  render: () => <SweepDemo />,
}

/**
 * The sweep is the thing being judged here, and a still frame cannot show it —
 * so this story ships a control. Tick items off and watch each arc move to its
 * new value rather than jumping there; turn Reduce Motion on in the OS and the
 * same taps land instantly instead.
 */
function SweepDemo() {
  const [habitsDone, setHabitsDone] = useState(1)
  const [tasksDone, setTasksDone] = useState(2)

  return (
    <Stage height={340} label="Mark one complete and watch the arc move">
      <Row>
        <Cell caption={`Habits ${habitsDone}/4 · Tasks ${tasksDone}/5`}>
          <ActivityRings
            rings={dayProgressRings({
              habits: { completed: habitsDone, expected: 4 },
              tasks: { completed: tasksDone, expected: 5 },
            })}
            diameter={110}
            lineWidth={13}
            spacing={6}
          />
        </Cell>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SweepButton
            label="Complete a habit"
            onClick={() => setHabitsDone((done) => Math.min(4, done + 1))}
          />
          <SweepButton
            label="Complete a task"
            onClick={() => setTasksDone((done) => Math.min(5, done + 1))}
          />
          <SweepButton
            label="Undo everything"
            onClick={() => {
              setHabitsDone(0)
              setTasksDone(0)
            }}
          />
        </div>
      </Row>
    </Stage>
  )
}

function SweepButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kro-glass kro-glass--control kro-glass--interactive rounded-kro-pill text-kro-fore"
      style={{
        padding: '10px 18px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  )
}
