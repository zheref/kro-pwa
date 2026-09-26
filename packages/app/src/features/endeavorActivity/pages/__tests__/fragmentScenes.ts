/** The Fragment's views, derived from `EndeavorActivityMocks` through the real Selector. */
import type { RootState } from '../../../../library/store'
import type { EndeavorActivityState } from '../../EndeavorActivityFeature'
import { EndeavorActivityMocks } from '../../EndeavorActivityMocks'
import { selectEndeavorActivityView } from '../../EndeavorActivitySelectors'

export const viewOf = (state: EndeavorActivityState) =>
  selectEndeavorActivityView({
    endeavorActivity: state,
  } as unknown as RootState)

export const fragmentScenes = {
  loadedMany: viewOf(EndeavorActivityMocks.loadedMany),
  loadedEmpty: viewOf(EndeavorActivityMocks.loadedEmpty),
  filteredEmpty: viewOf(EndeavorActivityMocks.abortedOnlyFinishedTab),
  longTitle: viewOf(EndeavorActivityMocks.loadedLongTitle),
  unicode: viewOf(EndeavorActivityMocks.loadedUnicode),
  reminder: viewOf(EndeavorActivityMocks.reminder),
  behavior: viewOf(EndeavorActivityMocks.behavior),
  loading: viewOf(EndeavorActivityMocks.loading),
  failed: viewOf(EndeavorActivityMocks.failed),
}
