/**
 * The Edit form's visual evidence (`RC-11`, `UZF-26`).
 *
 * The scene that matters most is `MetaKindFewerFields`: the same form over a
 * kind whose matrix removes Start, Duration and Reward, so the *absence* is
 * visible side by side with the task's full set.
 */
import { makeProject } from '@kro/core'
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { editableSections } from '../EndeavorDetailEditing'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import { EndeavorDetailExceptions } from '../EndeavorDetailException'
import { EndeavorEditFragment } from './EndeavorEditFragment'

const noop = () => {}

const projects = [
  makeProject({ id: 'proj-1', title: 'Household' }),
  makeProject({ id: 'proj-2', title: 'Work' }),
]

const scene = (
  endeavor: (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks],
) => ({
  working: endeavor,
  sections: editableSections(endeavor.kind),
  isValid: endeavor.title.trim().length > 0,
  isSaving: false,
  exception: null,
  projects,
  onChangeField: noop,
  onOpenDuration: noop,
})

export default {
  title: 'Endeavor Detail/Edit',
  component: EndeavorEditFragment,
  parameters: { layout: 'fullscreen' },
}

/** A task: every editable field the matrix allows. */
export const TypicalTask = {
  render: () => (
    <Stage width={430}>
      <EndeavorEditFragment {...scene(detailEndeavorMocks.task)} />
    </Stage>
  ),
}

/** A blueprint: Start, Duration and Reward are ABSENT, not disabled. */
export const MetaKindFewerFields = {
  render: () => (
    <Stage width={430}>
      <EndeavorEditFragment {...scene(detailEndeavorMocks.blueprint)} />
    </Stage>
  ),
}

/** A calendar event: no Due row for this kind. */
export const CalendarEvent = {
  render: () => (
    <Stage width={430}>
      <EndeavorEditFragment {...scene(detailEndeavorMocks.event)} />
    </Stage>
  ),
}

/** A blank title — the one v1 validation rule, stated rather than implied. */
export const InvalidTitle = {
  render: () => (
    <Stage width={430}>
      <EndeavorEditFragment
        {...scene(detailEndeavorMocks.untitled)}
        isValid={false}
      />
    </Stage>
  ),
}

/** A save in flight: every control disabled so a double-tap cannot race it. */
export const Saving = {
  render: () => (
    <Stage width={430}>
      <EndeavorEditFragment {...scene(detailEndeavorMocks.task)} isSaving />
    </Stage>
  ),
}

/** A save that failed — the working copy is untouched and still dirty. */
export const SaveFailed = {
  render: () => (
    <Stage width={430}>
      <EndeavorEditFragment
        {...scene(detailEndeavorMocks.task)}
        exception={EndeavorDetailExceptions.localPersistenceFailed('disk full')}
      />
    </Stage>
  ),
}

/** Both schemes, so the fields and pickers are judged in dark too. */
export const BothColorSchemes = {
  render: () => (
    <BothSchemes>
      <EndeavorEditFragment {...scene(detailEndeavorMocks.habit)} />
    </BothSchemes>
  ),
}
