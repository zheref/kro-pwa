import { Tag } from 'lucide-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Tag as FluentTag, TagGroup, tagPaint } from './Tag'

afterEach(cleanup)

describe('Tag', () => {
  it('always prints its value, so colour is never the only signal', () => {
    render(<FluentTag>Finance</FluentTag>)
    expect(screen.getByText('Finance')).not.toBeNull()
    expect(
      document
        .querySelector('[data-slot="tag"]')
        ?.getAttribute('data-appearance'),
    ).toBe('filled')
  })

  it('fills from back-inner, outlines with hairline, brands as an accent tint', () => {
    expect(tagPaint('filled').backgroundColor).toBe(
      'var(--kro-color-back-inner)',
    )
    expect(tagPaint('outline').boxShadow).toContain('--kro-color-hairline')
    expect(tagPaint('brand').backgroundColor).toContain('16%')
    expect(tagPaint('brand').color).toBe('var(--kro-color-accent)')
  })

  it('names the dismiss after the value it removes', async () => {
    const onDismiss = vi.fn()
    render(
      <FluentTag dismissible onDismiss={onDismiss}>
        Finance
      </FluentTag>,
    )

    const dismiss = screen.getByRole('button', { name: 'Remove Finance' })
    await userEvent.click(dismiss)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('hides a leading icon from readers because the word carries it', () => {
    const { container } = render(
      <FluentTag icon={<Tag data-icon="tag" />}>Finance</FluentTag>,
    )
    const iconWrap = container.querySelector('[aria-hidden]')
    expect(iconWrap).not.toBeNull()
    expect(container.querySelector('[data-icon="tag"]')).not.toBeNull()
  })
})

describe('TagGroup', () => {
  it('wraps rather than clipping — a tag that scrolls off is a bug', () => {
    const { container } = render(
      <TagGroup>
        <FluentTag>One</FluentTag>
        <FluentTag>Two</FluentTag>
      </TagGroup>,
    )
    const group = container.querySelector('[data-slot="tag-group"]')
    expect(group?.className).toContain('flex-wrap')
    expect(group?.className).not.toContain('overflow-x')
    expect(screen.getByText('Two')).not.toBeNull()
  })
})
