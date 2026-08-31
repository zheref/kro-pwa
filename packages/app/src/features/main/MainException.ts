/**
 * The shell's typed failure union (`RC-8`, `UZF-8`).
 *
 * The shell does three things that can fail, and all three touch the projects
 * store: reading the Lists section, creating a project from the inline "New
 * project…" row, and deleting one. Everything else it does — resolving flags,
 * choosing a destination, mapping a presentation — is synchronous and total.
 *
 * `unknown` is the defensive `.rejected` landing shape (`RC-26`), never a
 * routine path.
 */
import { type Exception, exception } from '@kro/core'

export type MainException =
  /** The Lists section could not be read from on-device storage. */
  | Exception<'listsLoadFailed'>
  /** The inline "New project…" row could not be persisted. */
  | Exception<'projectCreateFailed'>
  /** Deleting a project failed; the row stays. */
  | Exception<'projectDeleteFailed'>
  /** A project title that is empty once trimmed — canon refuses to save it. */
  | Exception<'projectTitleEmpty'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const MainExceptions = {
  listsLoadFailed: (reason: string): MainException =>
    exception('listsLoadFailed', `Couldn't load your lists: ${reason}`, true),

  projectCreateFailed: (reason: string): MainException =>
    exception(
      'projectCreateFailed',
      `Couldn't create that project: ${reason}`,
      true,
    ),

  projectDeleteFailed: (reason: string): MainException =>
    exception(
      'projectDeleteFailed',
      `Couldn't delete that project: ${reason}`,
      true,
    ),

  projectTitleEmpty: (): MainException =>
    exception('projectTitleEmpty', 'A project needs a name.', true),

  unknown: (reason: string): MainException =>
    exception('unknown', reason, true),
}
