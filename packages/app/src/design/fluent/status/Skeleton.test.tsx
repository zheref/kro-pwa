import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Skeleton, SkeletonItem } from './Skeleton'

afterEach(cleanup)

describe('Skeleton', () => {
  it('is hidden from assistive technology so the page can name the wait', () => {
    const { container } = render(
      <Skeleton>
        <SkeletonItem />
      </Skeleton>,
    )
    const root = container.querySelector('[data-slot="skeleton"]')
    expect(root?.getAttribute('aria-hidden')).toBe('true')
    expect(root?.getAttribute('data-animation')).toBe('pulse')
  })

  it('pulses by default and can wave or sit still', () => {
    const { rerender } = render(
      <Skeleton animation="wave">
        <SkeletonItem />
      </Skeleton>,
    )
    const item = () =>
      document.querySelector('[data-slot="skeleton-item"]') as HTMLElement

    expect(item().className).toContain('kro-fluent-skeleton')
    expect(item().getAttribute('data-animation')).toBe('wave')

    rerender(
      <Skeleton animation="none">
        <SkeletonItem />
      </Skeleton>,
    )
    expect(item().getAttribute('data-animation')).toBe('none')
  })

  it('sizes a rectangle from width and height, numbers as px', () => {
    const { container } = render(
      <Skeleton>
        <SkeletonItem width={120} height="8px" />
      </Skeleton>,
    )
    const item = container.querySelector(
      '[data-slot="skeleton-item"]',
    ) as HTMLElement
    expect(item.style.width).toBe('120px')
    expect(item.style.height).toBe('8px')
    expect(item.getAttribute('data-shape')).toBe('rectangle')
  })

  it('draws a circle whose height matches its width', () => {
    const { container } = render(
      <Skeleton>
        <SkeletonItem shape="circle" width={40} />
      </Skeleton>,
    )
    const item = container.querySelector(
      '[data-slot="skeleton-item"]',
    ) as HTMLElement
    expect(item.style.width).toBe('40px')
    expect(item.style.height).toBe('40px')
    expect(item.style.borderRadius).toBe('var(--kro-radius-pill)')
  })

  it('fades a translucent appearance without changing the recipe class', () => {
    const { container } = render(
      <Skeleton appearance="translucent">
        <SkeletonItem />
      </Skeleton>,
    )
    const item = container.querySelector(
      '[data-slot="skeleton-item"]',
    ) as HTMLElement
    expect(item.style.opacity).toBe('0.55')
    expect(item.className).toContain('kro-fluent-skeleton')
  })
})
