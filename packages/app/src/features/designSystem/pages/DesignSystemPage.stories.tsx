import { type ReactNode, useState } from 'react'
import { StoreProvider } from '../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { DesignSystemPage } from './DesignSystemPage'

/**
 * The stateful container, over a real store built with `makeStore(extra)`
 * (`RC-22`, `RC-35`) — never a second store, and never the network.
 */
export default {
  title: 'Design system/Gallery page',
  component: DesignSystemPage,
  parameters: { layout: 'fullscreen' },
}

function Preview({ theme = 'light' }: { theme?: 'light' | 'dark' }): ReactNode {
  const [store] = useState(() => makeStore(stubbedThunkExtra))

  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        height: 640,
        background: 'var(--kro-color-back)',
      }}
    >
      <StoreProvider store={store}>
        <DesignSystemPage />
      </StoreProvider>
    </div>
  )
}

export const Default = {
  render: () => <Preview />,
}

export const DarkScheme = {
  render: () => <Preview theme="dark" />,
}

export const Wide = {
  render: () => <Preview />,
}
