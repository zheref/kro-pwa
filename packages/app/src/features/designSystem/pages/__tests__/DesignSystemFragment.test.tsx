/**
 * The gallery's render tests, mirroring `DesignSystemFragment.stories.tsx`
 * 1:1 (`RC-11`). Semantic queries only — never a DOM snapshot of a story
 * canvas, which belongs to the snapshot suites under `design/`.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { designSystemMocks } from '../../DesignSystemMocks'
import {
  CATALOG_STORY_ROW_HEIGHT,
  DesignSystemFragment,
} from '../DesignSystemFragment'
import { STORY_CATALOG } from '../../storyCatalog'

afterEach(cleanup)

describe('DesignSystemFragment', () => {
  it('lists every catalog group in the inner sidebar', () => {
    render(<DesignSystemFragment {...designSystemMocks.default} />)

    expect(
      screen.getByRole('navigation', { name: 'Component library' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tokens' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Primitives' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Endeavor' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Chrome' }),
    ).toBeTruthy()
  })

  it("opens the selected story's section and leaves the others collapsed", () => {
    render(<DesignSystemFragment {...designSystemMocks.default} />)

    expect(
      screen
        .getByRole('button', { name: 'Tokens' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Primitives' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
    expect(screen.queryByRole('button', { name: 'Variants' })).toBeNull()
    expect(
      screen.getByRole('button', {
        name: STORY_CATALOG.stories.find(
          (story) => story.id === STORY_CATALOG.defaultStoryId,
        )?.name,
      }),
    ).toBeTruthy()
  })

  it('paints the canvas on the page field, not in a glass well', () => {
    render(<DesignSystemFragment {...designSystemMocks.default} />)

    const canvas = screen.getByTestId('design-system-canvas')
    const nav = screen.getByRole('navigation', { name: 'Component library' })

    expect(nav.className).toMatch(/kro-glass/)
    expect(canvas.className).not.toMatch(/kro-glass/)
    expect(canvas.tagName).toBe('SECTION')
  })

  it('scrolls the tree inside the glass pane, not the pane itself', () => {
    render(<DesignSystemFragment {...designSystemMocks.default} />)

    const nav = screen.getByRole('navigation', { name: 'Component library' })
    const scroller = screen.getByTestId('design-system-nav-scroll')

    expect(nav.contains(scroller)).toBe(true)
    expect(nav.className).not.toMatch(/overflow-y-auto/)
    expect(scroller.className).toMatch(/overflow-y-auto/)
  })

  it('packs component titles and variant rows denser than the product sidebar', () => {
    render(<DesignSystemFragment {...designSystemMocks.default} />)

    const componentTitle = screen.getByRole('heading', {
      level: 3,
      name: 'Tokens',
    })
    const variant = screen.getByRole('button', {
      name: STORY_CATALOG.stories.find(
        (story) => story.id === STORY_CATALOG.defaultStoryId,
      )?.name,
    })

    expect(componentTitle.className).toMatch(/text-\[11px\]/)
    expect(variant.className).toMatch(/text-\[11px\]/)
    expect(variant.style.minHeight).toBe(`${CATALOG_STORY_ROW_HEIGHT}px`)
  })

  it('marks the selected story and paints its name on the canvas', () => {
    render(<DesignSystemFragment {...designSystemMocks.buttonVariants} />)

    const selected = screen.getByRole('button', {
      name: STORY_CATALOG.stories.find(
        (story) => story.id === 'Button/Variants',
      )?.name,
    })
    expect(selected.getAttribute('aria-current')).toBe('true')
    expect(screen.getByTestId('design-system-story-name').textContent).toBe(
      'Variants',
    )
  })

  it('reports the story a row was tapped for, and never dispatches (RC-15)', async () => {
    const onSelectStory = vi.fn()
    render(
      <DesignSystemFragment
        {...designSystemMocks.default}
        onSelectStory={onSelectStory}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Primitives' }))
    await userEvent.click(screen.getByRole('button', { name: 'Variants' }))

    expect(onSelectStory).toHaveBeenCalledWith('Button/Variants')
  })

  it('expands a collapsed section so its stories can be reached', async () => {
    render(<DesignSystemFragment {...designSystemMocks.default} />)

    expect(screen.queryByRole('button', { name: 'Variants' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Primitives' }))

    expect(
      screen
        .getByRole('button', { name: 'Primitives' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(screen.getByRole('button', { name: 'Variants' })).toBeTruthy()
  })

  it('collapses an open section so its stories leave the tree', async () => {
    render(<DesignSystemFragment {...designSystemMocks.default} />)

    await userEvent.click(screen.getByRole('button', { name: 'Tokens' }))

    expect(
      screen
        .getByRole('button', { name: 'Tokens' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
    expect(
      screen.queryByRole('button', {
        name: STORY_CATALOG.stories.find(
          (story) => story.id === STORY_CATALOG.defaultStoryId,
        )?.name,
      }),
    ).toBeNull()
  })

  it('falls back to the default story when the selected id is unknown', () => {
    render(<DesignSystemFragment {...designSystemMocks.unknown} />)

    expect(screen.getByTestId('design-system-story-name').textContent).toBe(
      selectedStoryName(STORY_CATALOG.defaultStoryId),
    )
  })
})

const selectedStoryName = (id: string): string =>
  STORY_CATALOG.stories.find((story) => story.id === id)?.name ?? id
