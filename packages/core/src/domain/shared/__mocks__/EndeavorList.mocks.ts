/**
 * `AnyEndeavorList` fixtures — `RC-13`: three convenient, one neutral, three
 * inconvenient, spanning both members of the union so a consumer that
 * switches on `source` has a case of each.
 */
import {
  type AnyEndeavorList,
  makeProject,
  makeRemindersList,
} from '../EndeavorList'

export const endeavorListMocks = {
  /** Convenient: a coloured Kro project. */
  finances: makeProject({
    id: 'project-finances',
    title: 'Finances',
    color: '#4C6EF5',
  }),

  /** Convenient: a second coloured project, for grouping tests. */
  household: makeProject({
    id: 'project-household',
    title: 'Household',
    color: '#12B886',
  }),

  /** Convenient: a mirrored Apple Reminders list. */
  errands: makeRemindersList({
    id: 'reminders-errands',
    title: 'Errands',
    color: '#FA5252',
  }),

  /** Neutral: a project with no colour assigned. */
  uncolored: makeProject({ id: 'project-uncolored', title: 'Someday' }),

  /**
   * Inconvenient: mid-sync, so `inActivity` is `true` — and canon's equality
   * **ignores** that flag, which is what keeps a spinner from re-keying the
   * row.
   */
  syncing: makeRemindersList({
    id: 'reminders-syncing',
    title: 'Shared with Family',
    color: '#FAB005',
    inActivity: true,
  }),

  /** Inconvenient: an empty title, which no label can render. */
  untitled: makeProject({ id: 'project-untitled', title: '', color: null }),

  /**
   * Inconvenient: a long emoji-laden title and a colour string that is **not**
   * a valid hex — the type is a plain string and does not validate, so the
   * presentation tier has to.
   */
  malformedColor: makeRemindersList({
    id: 'reminders-malformed',
    title: '🎯 プロジェクト — a list title that keeps going and going and going',
    color: 'not-a-hex-colour',
  }),
} satisfies Record<string, AnyEndeavorList>

export const allEndeavorListMocks: readonly AnyEndeavorList[] =
  Object.values(endeavorListMocks)
