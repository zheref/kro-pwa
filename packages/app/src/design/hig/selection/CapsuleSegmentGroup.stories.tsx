import { CalendarClock, ChartNoAxesColumn, Timer } from 'lucide-react'
import { useState } from 'react'
import { CapsuleSegmentGroup } from './CapsuleSegmentGroup'

export default {
  title: 'Forms/Capsule segment group',
  component: CapsuleSegmentGroup,
}

type Reading = 'session' | 'performance' | 'plan'

const READINGS = [
  {
    value: 'session',
    label: 'Session',
    icon: (on: boolean) => (
      <Timer size={16} strokeWidth={on ? 2.5 : 2} aria-hidden="true" />
    ),
  },
  {
    value: 'performance',
    label: 'Performance',
    icon: (on: boolean) => (
      <ChartNoAxesColumn
        size={16}
        strokeWidth={on ? 2.5 : 2}
        aria-hidden="true"
      />
    ),
  },
  {
    value: 'plan',
    label: 'Plan',
    icon: (on: boolean) => (
      <CalendarClock size={16} strokeWidth={on ? 2.5 : 2} aria-hidden="true" />
    ),
  },
] as const

function Stage({ initial }: { readonly initial: Reading | null }) {
  const [value, setValue] = useState<Reading | null>(initial)
  return (
    <div className="inline-flex rounded-2xl bg-linear-to-br from-indigo-500 to-fuchsia-500 p-6">
      <CapsuleSegmentGroup
        label="Detail pane"
        options={READINGS}
        value={value}
        onSelect={(next) => setValue(next === value ? null : next)}
      />
    </div>
  )
}

/** Nothing selected — the pane is hidden. */
export const NoneSelected = { render: () => <Stage initial={null} /> }

/** The leading end selected — its fill follows the capsule's left curve. */
export const LeadingSelected = { render: () => <Stage initial="session" /> }

/** The trailing end selected — its fill follows the capsule's right curve. */
export const TrailingSelected = { render: () => <Stage initial="plan" /> }
