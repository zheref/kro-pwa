/**
 * The four relation screens' visual evidence (`RC-11`, `UZF-26`).
 *
 * One scene per relation, plus the two that carry the copy discipline: a
 * read-only Performances screen (the kind cannot record sessions, so the form
 * is replaced by the reason) and a Hosts screen where every provider is listed
 * with why it cannot be attached in this build.
 */
import { EndeavorRelation } from '@kro/core'
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import {
  attachedHostsOf,
  hostAttachCandidatesOf,
  relationEmptyState,
  relationReadOnlyReason,
} from '../EndeavorRelations'
import { EndeavorRelationFragment } from './EndeavorRelationFragment'

const NOW = new Date(2026, 5, 18, 9, 40)
const noop = () => {}

const scene = (
  endeavor: (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks],
  relation: EndeavorRelation,
) => ({
  relation,
  endeavor,
  readOnlyReason: relationReadOnlyReason(relation, endeavor.kind),
  emptyState: relationEmptyState(relation, endeavor.kind),
  isSaving: false,
  exception: null,
  draft: null,
  isDraftCommittable: false,
  attachedHosts: attachedHostsOf(endeavor),
  hostCandidates: hostAttachCandidatesOf(endeavor),
  now: NOW,
  locale: 'en-US',
  onChangeDraft: noop,
  onCommitDraft: noop,
  onRemoveEntry: noop,
  onAttachHost: noop,
  onDetachHost: noop,
})

export default {
  title: 'Endeavor Detail/Relations',
  component: EndeavorRelationFragment,
  parameters: { layout: 'fullscreen' },
}

/** Performances with three sessions logged, and the hand-log form below. */
export const Performances = {
  render: () => (
    <Stage width={430}>
      <EndeavorRelationFragment
        {...scene(
          detailEndeavorMocks.taskWithSessions,
          EndeavorRelation.performances,
        )}
      />
    </Stage>
  ),
}

/** The same screen on a kind that cannot record sessions — read-only, with why. */
export const PerformancesReadOnly = {
  render: () => (
    <Stage width={430}>
      <EndeavorRelationFragment
        {...scene(detailEndeavorMocks.event, EndeavorRelation.performances)}
      />
    </Stage>
  ),
}

/** Defers: an audit history that is empty, and says the endeavor kept its dates. */
export const Defers = {
  render: () => (
    <Stage width={430}>
      <EndeavorRelationFragment
        {...scene(detailEndeavorMocks.task, EndeavorRelation.defers)}
      />
    </Stage>
  ),
}

/** Hosts: every candidate listed, each disabled with the reason beside it. */
export const Hosts = {
  render: () => (
    <Stage width={430}>
      <EndeavorRelationFragment
        {...scene(detailEndeavorMocks.task, EndeavorRelation.hosts)}
      />
    </Stage>
  ),
}

/** Shadows: one mirror from a calendar, with its source and kind as chips. */
export const Shadows = {
  render: () => (
    <Stage width={430}>
      <EndeavorRelationFragment
        {...scene(detailEndeavorMocks.event, EndeavorRelation.shadows)}
      />
    </Stage>
  ),
}

/** A relation write in flight: the list dims and the controls stop responding. */
export const Saving = {
  render: () => (
    <Stage width={430}>
      <EndeavorRelationFragment
        {...scene(
          detailEndeavorMocks.taskWithSessions,
          EndeavorRelation.performances,
        )}
        isSaving
      />
    </Stage>
  ),
}

/** Both schemes, so the rows, chips and forms are judged in dark too. */
export const BothColorSchemes = {
  render: () => (
    <BothSchemes>
      <EndeavorRelationFragment
        {...scene(detailEndeavorMocks.task, EndeavorRelation.hosts)}
      />
    </BothSchemes>
  ),
}
