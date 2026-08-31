/**
 * Find's visual evidence (`RC-11`, `UZF-26`).
 *
 * Every scene is built from `#29`'s `findEndeavorMocks` through the same
 * adapter the Selector uses, so a story cannot show a list the slice could not
 * produce. The set mirrors `FindFragment.test.tsx` 1:1 — the loaded list, each
 * of the four empty states, the two input grammars, and both schemes.
 */
import { allFindEndeavorMocks, findEndeavorMocks } from '../FindMocks'
import { FindFragment } from './FindFragment'
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { adaptedRows, findCapabilitiesWith } from './__tests__/pagesHarness'

const NOW = new Date(2026, 5, 18, 9, 40)
const noop = () => {}

const capabilities = findCapabilitiesWith()
const detailCapabilities = findCapabilitiesWith(['endeavorDetail'])

const base = {
  query: '',
  rows: adaptedRows(allFindEndeavorMocks, capabilities),
  capabilities,
  emptyState: null,
  selectedKinds: ['task', 'calendarEvent', 'habit'] as const,
  selectedHosts: ['local', 'supabase', 'googleCalendar'] as const,
  selectedStatuses: ['pending', 'planned', 'ongoing'] as const,
  showArchived: false,
  visibleCount: allFindEndeavorMocks.length,
  isLoading: false,
  exception: null,
  now: NOW,
  locale: 'en-US',
  onChangeQuery: noop,
  onToggleFilter: noop,
  onToggleShowArchived: noop,
  onOperation: noop,
  onOpenDetail: noop,
  onDeleteAllVisible: noop,
  onArchiveAllVisible: noop,
  onRetry: noop,
} as const

export default {
  title: 'Find/Find',
  component: FindFragment,
  parameters: { layout: 'fullscreen' },
}

/** Mixed rows, chips active — the scene acceptance criterion 1 is read against. */
export const MixedRowsWithChips = {
  render: () => (
    <Stage width={430}>
      <FindFragment {...base} input="touch" />
    </Stage>
  ),
}

/** The same list on a pointer surface: hover strip and context menu, no swipe. */
export const PointerGrammar = {
  render: () => (
    <Stage width={880}>
      <FindFragment {...base} input="pointer" capabilities={detailCapabilities} />
    </Stage>
  ),
}

/** A live search that matched nothing — canon's "No Results". */
export const NoResults = {
  render: () => (
    <Stage width={430}>
      <FindFragment
        {...base}
        query="zzzz"
        rows={[]}
        visibleCount={0}
        emptyState={{ kind: 'noResults', query: 'zzzz' }}
        input="touch"
      />
    </Stage>
  ),
}

/** Every chip off — canon's "No Filters Selected", which is not "No Results". */
export const NoFiltersSelected = {
  render: () => (
    <Stage width={430}>
      <FindFragment
        {...base}
        rows={[]}
        visibleCount={0}
        selectedKinds={[]}
        selectedHosts={[]}
        selectedStatuses={[]}
        emptyState={{ kind: 'noFilters' }}
        input="touch"
      />
    </Stage>
  ),
}

/** A first run: nothing fetched at all. */
export const NoEndeavorsYet = {
  render: () => (
    <Stage width={430}>
      <FindFragment
        {...base}
        rows={[]}
        visibleCount={0}
        emptyState={{ kind: 'noData' }}
        input="touch"
      />
    </Stage>
  ),
}

/** A failed refresh over rows that are still good — canon keeps the list. */
export const FailedRefresh = {
  render: () => (
    <Stage width={430}>
      <FindFragment
        {...base}
        rows={adaptedRows(
          [findEndeavorMocks.morningTask, findEndeavorMocks.teamSync],
          capabilities,
        )}
        visibleCount={2}
        exception={{
          kind: 'fetchFailed',
          message: "Couldn't load your endeavors: offline",
          recoverable: true,
        }}
        input="touch"
      />
    </Stage>
  ),
}

/** Both schemes, so the chips and rows are judged in dark too. */
export const BothColorSchemes = {
  render: () => (
    <BothSchemes>
      <FindFragment {...base} input="touch" />
    </BothSchemes>
  ),
}
