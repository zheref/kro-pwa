/**
 * Endeavor Activity's pure renderer (`RC-15`, `UZF-4`) — canon's
 * `EndeavorActivityView` body. Props in, intent out through `onSelectTab`; no
 * store hook, no dispatch. Every string it shows was derived upstream except
 * the date and duration copy, which depend on the `locale` prop.
 */
import { Award, CircleCheck, CircleX, Flag, Timer, Zap } from 'lucide-react'
import type { PerformResolution } from '@kro/core'
import type { ReactNode } from 'react'
import { SegmentedControl } from '../../../design/hig/selection/SegmentedControl'
import { colorVar } from '../../../design/system/tokens/roles'
import {
  type ActivityRow,
  type ActivityTab,
  activityTabLabel,
  activityTabs,
  formatActivityDate,
  formatActivityDuration,
  outcomeLabel,
} from '../EndeavorActivityRows'
import type { EndeavorActivityView } from '../EndeavorActivitySelectors'

export interface EndeavorActivityFragmentProps {
  readonly view: EndeavorActivityView
  readonly locale?: string
  readonly onSelectTab: (tab: ActivityTab) => void
}

const subtle = (percent: number) =>
  `color-mix(in srgb, ${colorVar('fore')} ${percent}%, transparent)`

const tabOptions = activityTabs.map((tab) => ({
  value: tab,
  label: activityTabLabel(tab),
}))

function OutcomeGlyph({ resolution }: { resolution: PerformResolution }) {
  const props = { size: 14, 'aria-hidden': true } as const
  if (resolution === 'complete') return <CircleCheck {...props} />
  if (resolution === 'aborted') return <CircleX {...props} />
  return <Flag {...props} />
}

function Message({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-8 text-center">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs" style={{ color: colorVar('foreSecondary') }}>
        {message}
      </p>
    </div>
  )
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
      style={{ background: subtle(8) }}
    >
      {icon}
      {label}
    </span>
  )
}

function Row({ row, locale }: { row: ActivityRow; locale: string }) {
  return (
    <li
      className="flex items-center gap-3 rounded-kro-card px-3 py-2"
      style={{ background: subtle(6) }}
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-kro-card"
        style={{ width: 44, height: 44, background: subtle(8) }}
      >
        <Zap size={18} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-sm">
          {formatActivityDate(row, locale)}
        </span>
        <span className="text-xs" style={{ color: colorVar('foreSecondary') }}>
          {formatActivityDuration(row.duration)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
        <span className="inline-flex items-center gap-1">
          <OutcomeGlyph resolution={row.resolution} />
          {outcomeLabel(row.resolution)}
        </span>
        <span
          className="inline-flex items-center gap-1"
          style={{ color: colorVar('foreSecondary') }}
        >
          <Award size={12} aria-hidden />
          {row.rewardPoints}
        </span>
      </span>
    </li>
  )
}

export function EndeavorActivityFragment({
  view,
  locale = 'en-US',
  onSelectTab,
}: EndeavorActivityFragmentProps) {
  if (view.kind === 'loading') {
    return (
      <div
        className="px-3 py-8 text-center text-sm"
        style={{ color: colorVar('fore') }}
      >
        Loading activity…
      </div>
    )
  }
  if (view.kind === 'failed') {
    return (
      <div
        role="alert"
        className="px-3 py-8 text-center text-sm"
        style={{ color: colorVar('fore') }}
      >
        {view.message}
      </div>
    )
  }
  return (
    <section
      aria-label="Activity"
      className="flex flex-col gap-3 px-3 py-3"
      style={{ color: colorVar('fore') }}
    >
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 font-bold text-base">
          <span aria-hidden>{view.header.symbol}</span>
          <span className="min-w-0 break-words">{view.header.title}</span>
        </h2>
        <p className="text-xs" style={{ color: colorVar('foreSecondary') }}>
          Every activity recorded for this endeavor.
        </p>
      </header>
      {view.kind === 'unavailable' ? (
        <Message title={view.title} message={view.message} />
      ) : (
        <>
          {view.summary ? (
            <div className="flex flex-wrap gap-2">
              <Chip
                icon={<Zap size={12} aria-hidden />}
                label={view.summary.records}
              />
              <Chip
                icon={<Timer size={12} aria-hidden />}
                label={formatActivityDuration(view.summary.totalDuration)}
              />
              <Chip
                icon={<Award size={12} aria-hidden />}
                label={`${view.summary.totalPoints} pts`}
              />
            </div>
          ) : null}
          <SegmentedControl
            label="Resolution"
            density="compact"
            options={tabOptions}
            value={view.tab}
            onChange={onSelectTab}
          />
          {view.empty ? (
            <Message title={view.empty.title} message={view.empty.message} />
          ) : (
            <ul className="flex flex-col gap-2">
              {view.rows.map((row) => (
                <Row key={row.id} row={row} locale={locale} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
