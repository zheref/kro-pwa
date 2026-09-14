/**
 * The Design System destination's container, rendered against a real store
 * built with `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { PALETTE_ATTRIBUTE } from '../../../../design/system/tokens/appPalette'
import { THEME_ATTRIBUTE } from '../../../../design/system/tokens/readToken'
import { StoreProvider } from '../../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../../library/store'
import { DestinationKind } from '../../../main/SidebarDestination'
import { DesignSystemPage } from '../DesignSystemPage'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  document.documentElement.removeAttribute(PALETTE_ATTRIBUTE)
})

const renderPage = () => {
  const store = makeStore(stubbedThunkExtra)
  render(
    <StoreProvider store={store}>
      <DesignSystemPage />
    </StoreProvider>,
  )
  return store
}

describe('DesignSystemPage', () => {
  it('selects the Storybook destination on mount — the URL is the authority', () => {
    const store = renderPage()

    expect(store.getState().main.selected.kind).toBe(
      DestinationKind.designSystem,
    )
  })

  it('lands on the catalog default story', () => {
    renderPage()

    expect(screen.getByTestId('design-system-catalog')).toBeTruthy()
    expect(screen.getByTestId('design-system-story-name').textContent).toBe(
      'Overview',
    )
  })

  it('switches the canvas when a story row is tapped', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Button (Primitive)' }),
    )

    expect(screen.getByTestId('design-system-story-name').textContent).toBe(
      'Button',
    )
  })

  it('pins the document so portaled previews follow the gallery', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('tab', { name: 'Dark' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Green' }))

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
    expect(document.documentElement.getAttribute(PALETTE_ATTRIBUTE)).toBe(
      'green',
    )
  })
})
