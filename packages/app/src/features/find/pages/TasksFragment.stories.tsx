/**
 * All Tasks' visual evidence (`RC-11`, `UZF-26`).
 *
 * The grouped list at each of its three group states — clipped (every group
 * trimmed to seven), expanded (one group in full, its siblings collapsed), and
 * empty — plus the two other groupings the lens exposes, and both schemes.
 */
import { EndeavorGroupingCriteria } from '@kro/core'
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { allFindEndeavorMocks, nineOpenTasks } from '../FindMocks'
import { TasksFragment } from './TasksFragment'
import { adaptedGroups, tasksCapabilitiesWith } from './__tests__/pagesHarness'

const NOW = new Date(2026, 5, 18, 9, 40)
const noop = () => {}
const capabilities = tasksCapabilitiesWith()

const base = {
  heading: 'Tasks',
  subtitle: '',
  query: '',
  grouping: EndeavorGroupingCriteria.status,
  groups: adaptedGroups(nineOpenTasks, capabilities),
  expandedGroupKey: null,
  capabilities,
  emptyState: null,
  isLoading: false,
  exception: null,
  now: NOW,
  locale: 'en-US',
  input: 'touch',
  onChangeQuery: noop,
  onSelectGrouping: noop,
  onExpandGroup: noop,
  onCollapseGroups: noop,
  onOperation: noop,
  onSelectEndeavor: noop,
  onRetry: noop,
} as const

export default {
  title: 'Find/All Tasks',
  component: TasksFragment,
  parameters: { layout: 'fullscreen' },
}

/** Nine tasks in one status: seven shown, "Show more…" for the rest. */
export const ClippedToSeven = {
  render: () => (
    <Stage width={430}>
      <TasksFragment {...base} />
    </Stage>
  ),
}

/** The same group expanded — the limit lifts and the siblings collapse. */
export const OneGroupExpanded = {
  render: () => (
    <Stage width={430}>
      <TasksFragment
        {...base}
        groups={adaptedGroups(allFindEndeavorMocks, capabilities, {
          expandedGroupKey: 'pending',
        })}
        expandedGroupKey="pending"
      />
    </Stage>
  ),
}

/** Grouped by kind instead of status — the control the lens exposes. */
export const GroupedByKind = {
  render: () => (
    <Stage width={430}>
      <TasksFragment
        {...base}
        grouping={EndeavorGroupingCriteria.kind}
        groups={adaptedGroups(allFindEndeavorMocks, capabilities, {
          grouping: EndeavorGroupingCriteria.kind,
        })}
      />
    </Stage>
  ),
}

/** A list destination: the heading is the list's own title. */
export const ListDestination = {
  render: () => (
    <Stage width={900}>
      <TasksFragment
        {...base}
        heading="Household"
        subtitle="List"
        input="pointer"
        groups={adaptedGroups(allFindEndeavorMocks, capabilities)}
      />
    </Stage>
  ),
}

/** Nothing stored yet. */
export const Empty = {
  render: () => (
    <Stage width={430}>
      <TasksFragment {...base} groups={[]} emptyState={{ kind: 'noData' }} />
    </Stage>
  ),
}

/** Both schemes, so the group headers and footlines are judged in dark too. */
export const BothColorSchemes = {
  render: () => (
    <BothSchemes>
      <TasksFragment {...base} />
    </BothSchemes>
  ),
}
