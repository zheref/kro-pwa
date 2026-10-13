import { cleanup, render, screen } from '@testing-library/react'
import { press } from '../../../__tests__/domHelpers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LandingFooter } from '../LandingFooter'
import * as stories from '../LandingFooter.stories'

afterEach(cleanup)

describe('LandingFooter (mirrors LandingFooter.stories)', () => {
  it('Desktop — a contentinfo landmark with the Product, Open source and Trust columns', () => {
    render(stories.Desktop.render())
    expect(screen.getByRole('contentinfo')).toBeTruthy()
    for (const title of ['Product', 'Open source', 'Trust']) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    }
  })

  it('Dark — the legal line is the canon one', () => {
    render(stories.Dark.render())
    expect(
      screen.getByText('© 2026 Zheref · Kro — Manage your time, like the gods'),
    ).toBeTruthy()
  })

  it('Phone — the GitHub link is external, opens a new tab safely, and says so to assistive tech', () => {
    render(stories.Phone.render())
    const link = screen.getByRole('link', { name: /Kro for Web on GitHub/ })
    expect(link.getAttribute('href')).toBe('https://github.com/zheref/kro-pwa')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.textContent).toContain('(opens in a new tab)')
  })
})

describe('LandingFooter intents', () => {
  it('pressing the GitHub link reports an outbound with its href', () => {
    const onOutbound = vi.fn()
    render(<LandingFooter onOutbound={onOutbound} />)
    press(screen.getByRole('link', { name: /Kro for Web on GitHub/ }))
    expect(onOutbound).toHaveBeenCalledWith('https://github.com/zheref/kro-pwa')
  })

  it('in-page anchors are not outbound', () => {
    const onOutbound = vi.fn()
    render(<LandingFooter onOutbound={onOutbound} />)
    press(screen.getByRole('link', { name: 'Platforms' }))
    press(screen.getByRole('link', { name: 'Privacy' }))
    expect(onOutbound).not.toHaveBeenCalled()
  })

  it('every product link points at a section anchor', () => {
    render(<LandingFooter onOutbound={vi.fn()} />)
    const hrefs = ['The loop', 'Sessions', 'Platforms', 'Early access'].map(
      (name) => screen.getByRole('link', { name }).getAttribute('href'),
    )
    expect(hrefs).toEqual([
      '#the-loop',
      '#focus',
      '#platforms',
      '#early-access',
    ])
  })

  it('lists Pricing as its own page in the Product column', () => {
    render(<LandingFooter onOutbound={vi.fn()} />)
    expect(
      screen.getByRole('link', { name: 'Pricing' }).getAttribute('href'),
    ).toBe('/pricing')
  })

  it('on the pricing page every section link leads back to the landing, and none is outbound', () => {
    const onOutbound = vi.fn()
    render(<LandingFooter surface="pricing" onOutbound={onOutbound} />)
    expect(
      ['The loop', 'Early access', 'Privacy'].map((name) =>
        screen.getByRole('link', { name }).getAttribute('href'),
      ),
    ).toEqual(['/#the-loop', '/#early-access', '/#privacy'])
    press(screen.getByRole('link', { name: 'The loop' }))
    expect(onOutbound).not.toHaveBeenCalled()
  })
})
