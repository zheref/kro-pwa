/**
 * The Detail read surface's visual evidence (`RC-11`, `UZF-26`).
 *
 * The scenes are chosen so the **matrix** is visible, not just the happy path:
 * a task (every field and relation), a calendar event (three fields gone, two
 * relations read-only), a habit, a blueprint (the sparsest Core of any kind)
 * and a blank title.
 */
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { relationCards, visibleSections } from '../EndeavorDetailCards'
import { detailDisplayTitle } from '../EndeavorDetailCards'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import { EndeavorDetailFragment } from './EndeavorDetailFragment'

const noop = () => {}

const scene = (
  endeavor: (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks],
) => ({
  endeavor,
  title: detailDisplayTitle(endeavor),
  sections: visibleSections(endeavor.kind),
  relations: relationCards(endeavor),
  locale: 'en-US',
  onEditField: noop,
  onManageRelation: noop,
})

export default {
  title: 'Endeavor Detail/Read surface',
  component: EndeavorDetailFragment,
  parameters: { layout: 'fullscreen' },
}

/** A task: every field and every relation is editable for this kind. */
export const TypicalTask = {
  render: () => (
    <Stage width={430}>
      <EndeavorDetailFragment {...scene(detailEndeavorMocks.task)} />
    </Stage>
  ),
}

/** A calendar event: the matrix removes Due, Reward and Performances. */
export const CalendarEvent = {
  render: () => (
    <Stage width={430}>
      <EndeavorDetailFragment {...scene(detailEndeavorMocks.event)} />
    </Stage>
  ),
}

/** A habit — session-trackable, never due-dated. */
export const Habit = {
  render: () => (
    <Stage width={430}>
      <EndeavorDetailFragment {...scene(detailEndeavorMocks.habit)} />
    </Stage>
  ),
}

/** A blueprint: one of the three meta kinds, and the sparsest Core section. */
export const MetaKind = {
  render: () => (
    <Stage width={430}>
      <EndeavorDetailFragment {...scene(detailEndeavorMocks.blueprint)} />
    </Stage>
  ),
}

/** A blank title, which canon renders as "Untitled" rather than nothing. */
export const UntitledEndeavor = {
  render: () => (
    <Stage width={430}>
      <EndeavorDetailFragment {...scene(detailEndeavorMocks.untitled)} />
    </Stage>
  ),
}

/** Both schemes, so the grouped cards and chips are judged in dark too. */
export const BothColorSchemes = {
  render: () => (
    <BothSchemes>
      <EndeavorDetailFragment {...scene(detailEndeavorMocks.task)} />
    </BothSchemes>
  ),
}
