/**
 * The Find/Tasks render tier's public surface — a pure re-export barrel.
 *
 * `apps/web`'s route files import from here (through `@kro/app`) rather than
 * reaching into individual modules, so the boundary between the shell and the
 * feature is one line to read.
 */
export {
  CAPABILITY_FLAGS,
  resolveCapabilityFlagsThunk,
} from './FindCapabilitiesProducer'
export { type FindFragmentProps, FindFragment } from './FindFragment'
export { type FindPageProps, FindPage } from './FindPage'
export {
  type TasksFragmentProps,
  type TasksGroupModel,
  TasksFragment,
} from './TasksFragment'
export { type TasksPageProps, TasksPage } from './TasksPage'
export {
  ARCHIVED_CHIP,
  type FindEmptyCopy,
  type FindFilterChip,
  type FindFilterRow,
  type FindOverflowEntry,
  findEmptyCopy,
  findFilterRows,
  findOverflowEntries,
  findRowBadges,
  findRowSymbol,
  findRowTimeInfo,
  isFilterChipSelected,
} from './findPresentation'
