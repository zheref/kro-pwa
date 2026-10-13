import { cleanup, render, screen } from '@testing-library/react'
import { press } from '../../../__tests__/domHelpers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { landingAssets } from '../../../LandingAssets'
import { HeroSection } from '../HeroSection'
import * as stories from '../HeroSection.stories'

afterEach(cleanup)

describe('HeroSection (mirrors HeroSection.stories)', () => {
  it('Desktop — exactly one h1 with the canon headline, and the section is named by it', () => {
    const { container } = render(stories.Desktop.render())
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]?.textContent).toContain(
      "Control your time. Don't let time control you.",
    )
    const section = container.querySelector('section#top') as HTMLElement
    expect(section.getAttribute('aria-labelledby')).toBe(h1s[0]?.id)
  })

  it('Dark — both doors are links: the hub and the early-access anchor', () => {
    render(stories.Dark.render())
    expect(
      screen
        .getByRole('link', { name: 'Open Kro for Web' })
        .getAttribute('href'),
    ).toBe('/my-day')
    expect(
      screen
        .getByRole('link', { name: 'Get early access' })
        .getAttribute('href'),
    ).toBe('#early-access')
  })

  it('Phone — the product shots carry real alt text from the catalog, and the hero image is eager', () => {
    const { container } = render(stories.Phone.render())
    expect(
      screen.getByRole('img', { name: landingAssets.webMyDayDesktopDark.alt }),
    ).toBeTruthy()
    expect(
      screen.getByRole('img', { name: landingAssets.iosPlanTimeline.alt }),
    ).toBeTruthy()
    for (const image of container.querySelectorAll('img')) {
      expect(image.getAttribute('loading')).toBe('eager')
      expect(image.getAttribute('fetchpriority')).toBe('high')
      expect(Number(image.getAttribute('width'))).toBeGreaterThan(0)
      expect(Number(image.getAttribute('height'))).toBeGreaterThan(0)
    }
  })
})

describe('HeroSection intents and CLS', () => {
  it('reports the hero placement for each door', () => {
    const onOpenHub = vi.fn()
    const onGetEarlyAccess = vi.fn()
    render(
      <HeroSection
        hubUrl="/my-day"
        onOpenHub={onOpenHub}
        onGetEarlyAccess={onGetEarlyAccess}
      />,
    )
    press(screen.getByRole('link', { name: 'Open Kro for Web' }))
    press(screen.getByRole('link', { name: 'Get early access' }))
    expect(onOpenHub).toHaveBeenCalledWith('hero')
    expect(onGetEarlyAccess).toHaveBeenCalledWith('hero')
  })

  it('never animates the hero copy on load — no Reveal wrapper, so layout shift is zero', () => {
    const { container } = render(
      <HeroSection
        hubUrl="/my-day"
        onOpenHub={vi.fn()}
        onGetEarlyAccess={vi.fn()}
      />,
    )
    expect(container.querySelector('.kro-reveal, [data-reveal]')).toBeNull()
  })

  it('uses the hub URL it is given', () => {
    render(
      <HeroSection
        hubUrl="https://app.kro.example"
        onOpenHub={vi.fn()}
        onGetEarlyAccess={vi.fn()}
      />,
    )
    expect(
      screen
        .getByRole('link', { name: 'Open Kro for Web' })
        .getAttribute('href'),
    ).toBe('https://app.kro.example')
  })

  it('keeps the secondary door in its glass ink, never snow on light glass (contrast)', () => {
    render(
      <HeroSection
        hubUrl="/my-day"
        onOpenHub={vi.fn()}
        onGetEarlyAccess={vi.fn()}
      />,
    )
    const secondary = screen.getByRole('link', { name: 'Get early access' })
    expect(secondary.getAttribute('style')).toBeNull()
    expect(secondary.className).toContain('text-kro-fore')
  })
})
