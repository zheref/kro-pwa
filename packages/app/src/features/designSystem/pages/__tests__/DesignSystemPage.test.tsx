/**
 * The Design System destination's container, rendered against a real store
 * built with `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import { makeStore, stubbedThunkExtra } from '../../../../library/store'
import { DestinationKind } from '../../../main/SidebarDestination'
import { DesignSystemPage } from '../DesignSystemPage'
import { STORY_CATALOG } from '../../storyCatalog'

afterEach(cleanup)

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
      STORY_CATALOG.stories.find(
        (story) => story.id === STORY_CATALOG.defaultStoryId,
      )?.name,
    )
  })

  it('switches the canvas when a story row is tapped', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Primitives' }))
    await userEvent.click(screen.getByRole('button', { name: 'Variants' }))

    expect(screen.getByTestId('design-system-story-name').textContent).toBe(
      'Variants',
    )
  })
})
