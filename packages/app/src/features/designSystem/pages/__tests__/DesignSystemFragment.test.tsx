/**
 * The gallery's render tests, mirroring `DesignSystemFragment.stories.tsx`
 * 1:1 (`RC-11`). Semantic queries only — never a DOM snapshot of a story
 * canvas, which belongs to the snapshot suites under `design/`.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { designSystemMocks } from '../../DesignSystemMocks'
import { DesignSystemFragment } from '../DesignSystemFragment'
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

    await userEvent.click(screen.getByRole('button', { name: 'Variants' }))

    expect(onSelectStory).toHaveBeenCalledWith('Button/Variants')
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
