'use client'

import { useEffect, useRef } from 'react'
/**
 * The read-only Timeline the desktop detail pane shows when Plan has nothing
 * selected — canon's `macReadOnlyTimeline`. Pure (`RC-15`): it renders Plan's
 * `TimelineFragment` with `isReadOnly` and an empty interaction set, plus a
 * one-line failure sentence already derived in the domain tier (`RC-8`).
 *
 * Canon keeps the grid even when the day is empty, so there is no empty
 * state: an empty day is the bare grid with the now line.
 */
import type { PlacedEvent } from '../../plan/TimelineLayout'
import type { TimelineHourBand } from '../../plan/TimelineSlots'
import { TimelineFragment } from '../../plan/pages/timeline/TimelineFragment'

export interface DayTimelineFragmentProps {
  /** Start of today; `null` before the pane stamped a clock. */
  readonly day: Date | null
  readonly now: Date | null
  readonly band: TimelineHourBand
  readonly placements: readonly PlacedEvent[]
  /** `selectDayTimelineFailureCopy`. */
  readonly failureCopy: string | null
  /**
   * How long a session started now would run — Session Setup's default for a
   * new task. With `onStartSession`, the canvas previews that session.
   */
  readonly sessionPreviewSeconds?: number | null
  /** Start the previewed session: opens Session Setup. */
  readonly onStartSession?: () => void
  readonly locale?: string
}

/**
 * How far below the pane's top edge the now line lands on open — canon's
 * `nowLeadingPad`: enough of the past hour to read what just happened.
 */
export const DAY_TIMELINE_NOW_LEADING_PAD_PX = 64

const ignore = () => undefined

export function DayTimelineFragment({
  day,
  now,
  band,
  placements,
  failureCopy,
  sessionPreviewSeconds = null,
  onStartSession,
  locale,
}: DayTimelineFragmentProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)
  const isDrawn = day !== null && now !== null

  // Canon's initial scroll anchor: open on "now", not on midnight. Once per
  // mount, so the minute tick never yanks a pane the user has scrolled.
  useEffect(() => {
    if (!isDrawn || hasScrolledRef.current) return
    const line = rootRef.current?.querySelector<HTMLElement>(
      '[data-testid="plan-timeline-now"]',
    )
    if (!line || typeof line.scrollIntoView !== 'function') return
    hasScrolledRef.current = true
    line.style.scrollMarginTop = `${DAY_TIMELINE_NOW_LEADING_PAD_PX}px`
    line.scrollIntoView({ block: 'start' })
  }, [isDrawn])

  if (day === null || now === null) return null
  const sessionPreview =
    sessionPreviewSeconds !== null &&
    sessionPreviewSeconds > 0 &&
    onStartSession !== undefined
      ? {
          start: now,
          durationSeconds: sessionPreviewSeconds,
          title: 'New Session',
          onStart: onStartSession,
          locale,
        }
      : null
  return (
    <div ref={rootRef} data-testid="day-timeline" className="flex flex-col">
      {failureCopy !== null && (
        <p
          role="status"
          data-testid="day-timeline-failure"
          className="px-4 pb-2 text-[13px] text-kro-fore-secondary"
        >
          {failureCopy}
        </p>
      )}
      <TimelineFragment
        isReadOnly
        sessionPreview={sessionPreview}
        placements={placements}
        selectedDate={day}
        now={now}
        band={band}
        isShowingToday
        slotCount={0}
        isQuickCreateAvailable={false}
        quickCreate={null}
        editingEndeavorId={null}
        onViewDetail={ignore}
        onHoldBlock={ignore}
        onGrabHandle={ignore}
        onDragHandle={ignore}
        onReleaseHandle={ignore}
        onTapOutsideEditing={ignore}
        onPressSlot={ignore}
        className="flex-none"
      />
    </div>
  )
}
