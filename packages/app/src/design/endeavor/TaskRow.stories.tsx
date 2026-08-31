/**
 * `TaskRow` — the dense, pointer-first list row.
 *
 * Hover a row: the checkbox grows its "Mark Complete" label, which is canon's
 * `onHover` treatment and costs no state on the web. The selected row is the
 * detail worth checking twice — it paints the opposite pole and re-themes its
 * whole subtree, so its contents should read light-on-dark in light mode and
 * dark-on-light in dark mode.
 */

import { TaskRow } from './TaskRow'
import type { TaskRowModel } from './TaskRow'
import { SurfaceCard } from './SurfaceCard'
import { BothSchemes, Stage } from './storyStage'

export default {
  title: 'Endeavor/TaskRow',
  component: TaskRow,
}

const rows: readonly TaskRowModel[] = [
  {
    id: 'clean',
    title: 'Clean the house',
    subline: 'Created on Apr 12, 2026',
    isCompleted: false,
    isOverdue: false,
    hostGlyphs: ['network'],
    duration: 45 * 60,
    sessionPoints: null,
    isBusy: false,
  },
  {
    id: 'call',
    title: 'Call Mom',
    subline: 'Due Apr 14, 2026',
    isCompleted: false,
    isOverdue: true,
    hostGlyphs: ['network', 'g.circle.fill'],
    duration: null,
    sessionPoints: 2,
    isBusy: false,
  },
  {
    id: 'paperwork',
    title: 'Collect the paperwork',
    subline: 'Created on Apr 2, 2026',
    isCompleted: true,
    isOverdue: false,
    hostGlyphs: ['memorychip'],
    duration: 90 * 60,
    sessionPoints: null,
    isBusy: false,
  },
  {
    id: 'sync',
    title: 'Reconcile the Google Calendar mirror',
    subline: null,
    isCompleted: false,
    isOverdue: false,
    hostGlyphs: ['g.circle.fill'],
    duration: null,
    sessionPoints: 6,
    isBusy: true,
  },
]

export const List = {
  name: 'A list of rows',
  render: () => (
    <Stage width={640}>
      <SurfaceCard padding={null}>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((model) => (
            <TaskRow key={model.id} model={model} onStart={() => undefined} />
          ))}
        </div>
      </SurfaceCard>
    </Stage>
  ),
}

export const Selected = {
  name: 'Selected · the row re-themes its subtree',
  render: () => (
    <Stage width={640}>
      <SurfaceCard padding={null}>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((model, index) => (
            <TaskRow
              key={model.id}
              model={model}
              isSelected={index === 1}
              onStart={() => undefined}
            />
          ))}
        </div>
      </SurfaceCard>
    </Stage>
  ),
}

export const PointsWithoutDuration = {
  name: 'Reward points standing in for a duration',
  render: () => (
    <Stage width={640}>
      <SurfaceCard padding={null}>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3, 6].map((points) => (
            <TaskRow
              key={points}
              model={{
                id: `points-${points}`,
                title: `${points} session point${points === 1 ? '' : 's'}`,
                subline: null,
                isCompleted: false,
                isOverdue: false,
                hostGlyphs: [],
                duration: null,
                sessionPoints: points,
                isBusy: false,
              }}
              onStart={() => undefined}
            />
          ))}
        </div>
      </SurfaceCard>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <SurfaceCard padding={null}>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TaskRow model={rows[0] as TaskRowModel} onStart={() => undefined} />
          <TaskRow model={rows[1] as TaskRowModel} isSelected onStart={() => undefined} />
        </div>
      </SurfaceCard>
    </BothSchemes>
  ),
}
