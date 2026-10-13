import { type ReactNode, useState } from 'react'
import { StoreProvider } from '../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../library/store'
import { makeInMemoryLocalStore } from '../../services/localStore/InMemoryLocalStore'
import { DO_MOCK_NOW, doFixtureRecords } from '../do/DoMocks'
import { DoPage } from '../do/pages/DoPage'
import { MainShellPage } from './MainShellPage'

/**
 * The real shell around the real My Day, over a seeded in-memory `LocalStore`
 * (`RC-22`, `RC-35`): the surface a visitor gets at `/my-day`, with the
 * gradient field, the glass sidebar (or the tab bar when narrow) and the day's
 * lanes populated from `DoMocks`. The stage fills the viewport, so the shell's
 * own surface measurement picks the idiom — the landing page's screenshots are
 * captures of these stories (`apps/web/e2e-kit/landing-captures.spec.ts`).
 */
export default {
  title: 'Shell/App shell (live My Day)',
  component: MainShellPage,
  parameters: { layout: 'fullscreen' },
}

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

/** A desktop-wide viewport: sidebar shell, My Day populated. */
export const MyDayInTheShell = { render: () => <LiveShell /> }

/** A phone-wide viewport: tab bar, My Day populated. */
export const MyDayInTheTabBarShell = { render: () => <LiveShell /> }

/** The same shell with no destination mounted in it. */
export const AnEmptyDayInTheShell = {
  render: () => <LiveShell empty />,
}
