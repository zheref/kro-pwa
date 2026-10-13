import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarketingStage, placeholderShot } from '../marketingStage'

afterEach(cleanup)

describe('MarketingStage', () => {
  it('pins the light scheme and desktop idiom by default', () => {
    const { container } = render(<MarketingStage>x</MarketingStage>)
    const stage = container.firstElementChild as HTMLElement
    expect(stage.getAttribute('data-theme')).toBe('light')
    expect(stage.getAttribute('data-kro-idiom')).toBe('desktop')
  })

  it('pins dark and the mobile idiom when asked', () => {
    const { container } = render(
      <MarketingStage theme="dark" idiom="mobile" width={390}>
        x
      </MarketingStage>,
    )
    const stage = container.firstElementChild as HTMLElement
    expect(stage.getAttribute('data-theme')).toBe('dark')
    expect(stage.getAttribute('data-kro-idiom')).toBe('mobile')
    expect(stage.style.width).toBe('390px')
  })

  it('becomes the containing block for fixed children when contained', () => {
    render(<MarketingStage contained={240}>inside</MarketingStage>)
    const stage = screen.getByText('inside')
    expect(stage.style.height).toBe('240px')
    expect(stage.style.position).toBe('relative')
  })
})

describe('placeholderShot', () => {
  it('is a self-contained SVG data URI sized to the request', () => {
    const uri = placeholderShot(300, 600)
    expect(uri.startsWith('data:image/svg+xml')).toBe(true)
    expect(decodeURIComponent(uri)).toContain("width='300'")
  })

  it('contains no hex colour literal', () => {
    expect(decodeURIComponent(placeholderShot(10, 10))).not.toMatch(
      /#[0-9a-f]{3,6}\b/i,
    )
  })

  it('differs per size so two frames never share a cached image', () => {
    expect(placeholderShot(10, 20)).not.toBe(placeholderShot(20, 10))
  })
})
