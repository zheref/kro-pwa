/**
 * The timeline canvas, in the states its render tests assert (`RC-11`).
 *
 * Every scene is built from #18's own fixtures through #18's own layout pass,
 * so a story cannot show a canvas the slice could not produce (`RC-31`). The
 * pairs are deliberate: the nested-overlap scene is the one the column sweep
 * exists for, the edit scene is where the handles live, and the ghost scene is
 * what quick-create leaves behind while the prompt is open.
 */
import type { ReactNode } from 'react'
import { BothSchemes, Stage } from '../../../../design/endeavor/storyStage'
import { startOfPlanDay } from '../../PlanCalendar'
import {
  PLAN_REFERENCE_DAY,
  PLAN_REFERENCE_NOW,
  planAt,
  planDayFixtures,
  planEditSessionFixture,
} from '../../PlanMocks'
import { timelinePlacements } from '../../TimelineLayout'
import { timelineSlotCount } from '../../TimelineSlots'
import { PlanDayPickerFragment } from '../PlanDayPickerFragment'
import { planDayPickerDates } from '../../PlanNavigation'
import { TimelineFragment } from './TimelineFragment'

export default {
  title: 'Plan/Timeline canvas',
  component: TimelineFragment,
  parameters: { layout: 'fullscreen' },
}

const selectedDate = startOfPlanDay(PLAN_REFERENCE_DAY)
const FULL = { start: 0, endExclusive: 24 }
const BUSINESS = { start: 8, endExclusive: 20 }

/** A window tall enough to scroll in, so the canvas is judged as a canvas. */
function Viewport({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ height: 620, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

const canvas = (
  overrides: Partial<Parameters<typeof TimelineFragment>[0]> = {},
) => (
  <Viewport>
    <TimelineFragment
      placements={timelinePlacements(
        planDayFixtures.longBlockWithShortOverlaps,
        { on: selectedDate, startHour: FULL.start },
      )}
      selectedDate={selectedDate}
      now={PLAN_REFERENCE_NOW}
      band={FULL}
      isShowingToday
      slotCount={timelineSlotCount(FULL)}
      isQuickCreateAvailable
      quickCreate={null}
      editingEndeavorId={null}
      topInsetPx={74}
      bottomInsetPx={102}
      overlay={
        <PlanDayPickerFragment
          dates={planDayPickerDates(selectedDate)}
          selectedDate={selectedDate}
          now={PLAN_REFERENCE_NOW}
          onSelectDate={() => {}}
          onStepDay={() => {}}
        />
      }
      onViewDetail={() => {}}
      onHoldBlock={() => {}}
      onGrabHandle={() => {}}
      onDragHandle={() => {}}
      onReleaseHandle={() => {}}
      onTapOutsideEditing={() => {}}
      onPressSlot={() => {}}
      {...overrides}
    />
  </Viewport>
)

/** A long block with two short ones nested inside it — three live columns. */
export const NestedOverlaps = {
  render: () => <Stage width={390}>{canvas()}</Stage>,
}

/** Three mutually-overlapping events — the widest cluster canon tuned against. */
export const DenseCluster = {
  render: () => (
    <Stage width={390}>
      {canvas({
        placements: timelinePlacements(planDayFixtures.denseOverlapCluster, {
          on: selectedDate,
          startHour: FULL.start,
        }),
      })}
    </Stage>
  ),
}

/** A card armed for editing: outline, two handles, and no slot layer beneath. */
export const EditModeArmed = {
  render: () => (
    <Stage width={390}>
      {canvas({ editingEndeavorId: planEditSessionFixture.endeavorId })}
    </Stage>
  ),
}

/** The dashed hour ghost the creation prompt leaves on the canvas. */
export const QuickCreateGhost = {
  render: () => (
    <Stage width={390}>
      {canvas({
        placements: timelinePlacements(planDayFixtures.longSoloBlock, {
          on: selectedDate,
          startHour: FULL.start,
        }),
        quickCreate: { start: planAt(14), durationSeconds: 3600 },
      })}
    </Stage>
  ),
}

/** A narrowed band: 08:00 at the top, and the closing rule at 20:00. */
export const BusinessHoursBand = {
  render: () => (
    <Stage width={390}>
      {canvas({
        band: BUSINESS,
        slotCount: timelineSlotCount(BUSINESS),
        placements: timelinePlacements(planDayFixtures.fullDayLongAndShort, {
          on: selectedDate,
          startHour: BUSINESS.start,
        }),
      })}
    </Stage>
  ),
}

/** A day with nothing on it — the grid alone has to read as a day. */
export const EmptyDay = {
  render: () => (
    <Stage width={390}>
      {canvas({
        placements: timelinePlacements(planDayFixtures.empty, {
          on: selectedDate,
          startHour: FULL.start,
        }),
      })}
    </Stage>
  ),
}

/** The same busy day in both schemes, side by side. */
export const BothSchemesBusyDay = {
  render: () => <BothSchemes>{canvas()}</BothSchemes>,
}
