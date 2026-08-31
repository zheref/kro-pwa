import type { EndeavorRecord } from '@kro/core'
import { type ReactNode, useState } from 'react'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { onSurfaceChanged } from '../../main/MainFeature'
import type { DoSurface } from '../../main/DoSurfaceLayout'
import { DO_MOCK_NOW, doFixtureRecords } from '../DoMocks'
import { DoPage } from './DoPage'

/**
 * The stateful container, over a real store built with `makeStore(extra)` and a
 * seeded in-memory `LocalStore` (`RC-22`, `RC-35`) — never a second store, and
 * never the network.
 *
 * `now` is pinned to `DO_MOCK_NOW`, so every lane, badge and caption is the same
 * on every machine.
 */
export default {
  title: 'Do/Page',
  component: DoPage,
  parameters: { layout: 'fullscreen' },
}

const desktop: DoSurface = { idiom: 'desktop', width: 'regular' }
const handheld: DoSurface = { idiom: 'handheld', width: 'compact' }

function Preview({
  theme = 'light',
  width,
  height = 760,
  surface,
  records = doFixtureRecords(),
}: {
  theme?: 'light' | 'dark'
  width: number
  height?: number
  surface: DoSurface
  records?: readonly EndeavorRecord[]
}): ReactNode {
  // Built ONCE, in a lazy initialiser — the same shape `MainShellPage` uses.
  // Calling `makeStore` in the body would hand out a fresh store on every
  // re-render, so toggling a Storybook control would silently reset the day.
  // The surface is stamped here too: the shell is the artifact that measures
  // the browser, and a story states the answer rather than mounting the whole
  // shell for one boolean.
  const [store] = useState(() => {
    const built = makeStore({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore({ endeavors: records }),
    })
    built.dispatch(onSurfaceChanged({ surface }))
    return built
  })

  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        background: 'var(--kro-color-back)',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      <GradientBackdrop height="220px" />
      <div style={{ position: 'relative', height: '100%' }}>
        <StoreProvider store={store}>
          <DoPage
            now={DO_MOCK_NOW}
            locale="en-US"
            initialLaneWidth={width - 32}
          />
        </StoreProvider>
      </div>
    </div>
  )
}

/** The desktop composition: expanded header, seven-card hero lane. */
export const Desktop = {
  render: () => <Preview width={1120} surface={desktop} />,
}

/** The handheld composition: compact header, three-card hero lane. */
export const Handheld = {
  render: () => <Preview width={390} height={800} surface={handheld} />,
}

/** First launch — nothing anywhere. */
export const EmptyDay = {
  render: () => <Preview width={1120} surface={desktop} records={[]} />,
}

/** Both schemes at the desktop width. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Preview theme="light" width={720} height={660} surface={desktop} />
      <Preview theme="dark" width={720} height={660} surface={desktop} />
    </div>
  ),
}

/** Both schemes at the handheld width. */
export const BothSchemesNarrow = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Preview theme="light" width={390} height={660} surface={handheld} />
      <Preview theme="dark" width={390} height={660} surface={handheld} />
    </div>
  ),
}
