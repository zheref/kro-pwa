import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { press } from '../../../__tests__/domHelpers'
import { PricingCtaSection } from '../PricingCtaSection'
import * as stories from '../PricingCtaSection.stories'

afterEach(cleanup)

describe('PricingCtaSection (mirrors PricingCtaSection.stories)', () => {
  it('Desktop — "Start free today." with both doors as links', () => {
    render(stories.Desktop.render())
    expect(
      screen.getByRole('heading', { level: 2, name: 'Start free today.' }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Open Kro for Web' })
        .getAttribute('href'),
    ).toBe('/my-day')
    expect(
      screen
        .getByRole('link', { name: 'Get early access' })
        .getAttribute('href'),
    ).toBe('/#early-access')
  })

  it('Dark — the hub door follows the hub on its own origin', () => {
    render(stories.Dark.render())
    expect(
      screen
        .getByRole('link', { name: 'Open Kro for Web' })
        .getAttribute('href'),
    ).toBe('https://app.kro.example/my-day')
  })

  it('Phone — is a plain div, not an unnamed region landmark', () => {
    const { container } = render(stories.Phone.render())
    expect(container.querySelector('div#pricing-start')).not.toBeNull()
    expect(container.querySelector('section#pricing-start')).toBeNull()
  })
})

describe('PricingCtaSection intents', () => {
  it('reports the pricing placement for each door', () => {
    const onOpenHub = vi.fn()
    const onGetEarlyAccess = vi.fn()
    render(
      <PricingCtaSection
        hubUrl="/my-day"
        onOpenHub={onOpenHub}
        onGetEarlyAccess={onGetEarlyAccess}
      />,
    )
    press(screen.getByRole('link', { name: 'Open Kro for Web' }))
    press(screen.getByRole('link', { name: 'Get early access' }))
    expect(onOpenHub).toHaveBeenCalledWith('pricing')
    expect(onGetEarlyAccess).toHaveBeenCalledWith('pricing')
  })
})
