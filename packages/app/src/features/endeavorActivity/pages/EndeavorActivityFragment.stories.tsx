/** Endeavor Activity's visual evidence (`RC-11`, `UZF-26`), from `EndeavorActivityMocks`. */
import { Stage } from '../../../design/endeavor/storyStage'
import { EndeavorActivityFragment } from './EndeavorActivityFragment'
import { fragmentScenes } from './__tests__/fragmentScenes'

const noop = () => {}

export default {
  title: 'Endeavor Activity/Fragment',
  component: EndeavorActivityFragment,
  parameters: { layout: 'fullscreen' },
}

export const LoadedMany = {
  render: () => (
    <Stage width={380}>
      <EndeavorActivityFragment
        view={fragmentScenes.loadedMany}
        onSelectTab={noop}
      />
    </Stage>
  ),
}

export const NoActivityYet = {
  render: () => (
    <Stage width={380}>
      <EndeavorActivityFragment
        view={fragmentScenes.loadedEmpty}
        onSelectTab={noop}
      />
    </Stage>
  ),
}

export const FilteredEmpty = {
  render: () => (
    <Stage width={380}>
      <EndeavorActivityFragment
        view={fragmentScenes.filteredEmpty}
        onSelectTab={noop}
      />
    </Stage>
  ),
}

export const SessionsDontApply = {
  render: () => (
    <Stage width={380}>
      <EndeavorActivityFragment
        view={fragmentScenes.reminder}
        onSelectTab={noop}
      />
    </Stage>
  ),
}

export const Loading = {
  render: () => (
    <Stage width={380}>
      <EndeavorActivityFragment
        view={fragmentScenes.loading}
        onSelectTab={noop}
      />
    </Stage>
  ),
}

export const Failed = {
  render: () => (
    <Stage width={380}>
      <EndeavorActivityFragment
        view={fragmentScenes.failed}
        onSelectTab={noop}
      />
    </Stage>
  ),
}
