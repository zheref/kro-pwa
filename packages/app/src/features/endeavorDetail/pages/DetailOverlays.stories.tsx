/**
 * The global Detail overlay, mounted on a real store (`RC-11`).
 *
 * Each scene drives the overlay the way the app does — by parking the
 * `viewDetail` intent the row would raise — so what is drawn is what the intent
 * queue, the drain and the presentation actually produce.
 */
import { Stage } from '../../../design/endeavor/storyStage'
import {
  Harness,
  makeSeededStore,
} from '../../find/pages/__tests__/pagesHarness'
import { onDetailRequested, onEditRequested } from '../EndeavorDetailFeature'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import {
  userDidTapField,
  userDidTapManageRelation,
} from '../EndeavorDetailFeature'
import { DetailOverlays } from './DetailOverlays'
import type { AppStore } from '../../../library/store'

type Mock = (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks]

const presented = (endeavor: Mock, then?: (store: AppStore) => void) => {
  const store = makeSeededStore({ endeavors: [endeavor] })
  store.dispatch(onDetailRequested({ endeavor }))
  then?.(store)
  return store
}

export default {
  title: 'Endeavor Detail/Overlay',
  component: DetailOverlays,
  parameters: { layout: 'fullscreen' },
}

/** The read surface, over a task. The sheet is the shell's own presentation. */
export const DetailSheet = {
  render: () => (
    <Stage width={900}>
      <Harness store={presented(detailEndeavorMocks.task)}>
        <DetailOverlays locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** The full editor, opened directly by another surface's `edit` operation. */
export const EditOverDetail = {
  render: () => (
    <Stage width={900}>
      <Harness
        store={presented(detailEndeavorMocks.event, (store) => {
          store.dispatch(
            onEditRequested({ endeavor: detailEndeavorMocks.event }),
          )
        })}
      >
        <DetailOverlays locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** The Duration profile, reached from the Detail row that opens it. */
export const DurationProfile = {
  render: () => (
    <Stage width={900}>
      <Harness
        store={presented(detailEndeavorMocks.taskWithSessions, (store) => {
          store.dispatch(userDidTapField({ field: 'duration' }))
        })}
      >
        <DetailOverlays locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** A relation screen, reached from its Manage affordance. */
export const RelationScreen = {
  render: () => (
    <Stage width={900}>
      <Harness
        store={presented(detailEndeavorMocks.task, (store) => {
          store.dispatch(userDidTapManageRelation({ relation: 'hosts' }))
        })}
      >
        <DetailOverlays locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** Nothing presented: the overlay renders nothing at all. */
export const Closed = {
  render: () => (
    <Stage width={900}>
      <Harness store={makeSeededStore()}>
        <DetailOverlays locale="en-US" />
      </Harness>
    </Stage>
  ),
}
