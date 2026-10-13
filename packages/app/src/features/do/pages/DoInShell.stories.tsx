import { type ReactNode, useState } from 'react'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { MainShellPage } from '../../main/MainShellPage'
import { DO_MOCK_NOW, doFixtureRecords } from '../DoMocks'
import { DoPage } from './DoPage'

/**
 * The real shell around the real My Day, over a seeded in-memory `LocalStore`
 * (`RC-22`, `RC-35`): the surface a visitor gets at `/my-day`, with the
 * gradient field, the glass sidebar (or the tab bar when narrow) and the day's
 * lanes populated from `DoMocks`. The shell measures the browser window to
 * pick its idiom, so each story pins the surface it shows — `parameters.surface`
 * is the window the story is meant for, and the Storybook viewport global
 * sizes the canvas to match; the mirror test installs the same surface from
 * that parameter, so story and test never diverge (`RC-11`). The landing page's
 * screenshots are captures of these stories
 * (`apps/web/e2e-kit/landing-captures.spec.ts`).
 *
 * It lives beside `DoPage`, on the side that already depends on `main`
 * (`DoPage` imports the shell's feature, Producer and Selectors), so the
 * composition adds no `main → do` edge (`UZF-6`).
 */
export default {
  title: 'Shell/App shell (live My Day)',
  component: MainShellPage,
  parameters: { layout: 'fullscreen' },
}

/** The window a story is meant for: what the shell measures to pick its idiom. */
export interface LiveShellSurface {
  readonly width: number
  readonly coarse: boolean
}

/** A desktop window: wide, fine pointer — the sidebar shell. */
export const DESKTOP_SURFACE: LiveShellSurface = { width: 1440, coarse: false }

/** A phone window: narrow, touch — the tab-bar shell. */
export const PHONE_SURFACE: LiveShellSurface = { width: 390, coarse: true }

function LiveShell({ empty = false }: { empty?: boolean }): ReactNode {
  const [store] = useState(() =>
    makeStore({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore({ endeavors: doFixtureRecords() }),
    }),
  )
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <StoreProvider store={store}>
        <MainShellPage isDevelopment={false}>
          {empty ? null : (
            <DoPage now={DO_MOCK_NOW} locale="en-US" initialLaneWidth={900} />
          )}
        </MainShellPage>
      </StoreProvider>
    </div>
  )
}

/** A desktop-wide window: sidebar shell, My Day populated (the responsive canvas). */
export const MyDayInTheShell = {
  parameters: { surface: DESKTOP_SURFACE },
  render: () => <LiveShell />,
}

/** A phone-wide, touch window: tab bar, My Day populated. */
export const MyDayInTheTabBarShell = {
  parameters: { surface: PHONE_SURFACE },
  // Storybook's built-in `mobile2` viewport is 414×896, the nearest phone canvas.
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => <LiveShell />,
}

/** The same shell with no destination mounted in it. */
export const AnEmptyDayInTheShell = {
  parameters: { surface: DESKTOP_SURFACE },
  render: () => <LiveShell empty />,
}
