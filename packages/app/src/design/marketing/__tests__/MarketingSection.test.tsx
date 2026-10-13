import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarketingSection } from '../MarketingSection'

afterEach(cleanup)

describe('MarketingSection', () => {
  it('is a region with the anchor id and a centred container', () => {
    const { container } = render(
      <MarketingSection id="features" labelledBy="t">
        <h2 id="t">Features</h2>
      </MarketingSection>,
    )
    const section = container.querySelector('section') as HTMLElement
    expect(section.id).toBe('features')
    expect(section.className).toContain('kro-marketing-section')
    expect(screen.getByRole('region', { name: 'Features' })).toBe(section)
    expect(section.querySelector('.kro-marketing-container')).not.toBeNull()
  })

  it('can render a plain div and a narrow or wide measure', () => {
    const { container, rerender } = render(
      <MarketingSection id="a" as="div" width="narrow">
        x
      </MarketingSection>,
    )
    expect(container.querySelector('section')).toBeNull()
    expect(
      container.querySelector('.kro-marketing-container--narrow'),
    ).not.toBeNull()
    rerender(
      <MarketingSection id="a" as="div" width="wide">
        x
      </MarketingSection>,
    )
    expect(
      container.querySelector('.kro-marketing-container--wide'),
    ).not.toBeNull()
  })

  it('adds the decorative gradient field only for the gradient and glass tones', () => {
    const { container, rerender } = render(
      <MarketingSection id="a" tone="subtle">
        x
      </MarketingSection>,
    )
    expect(
      container.querySelector('[data-testid="detail-backdrop"]'),
    ).toBeNull()
    rerender(
      <MarketingSection id="a" tone="gradient">
        x
      </MarketingSection>,
    )
    expect(
      container.querySelector('[data-testid="detail-backdrop"]'),
    ).not.toBeNull()
    expect(container.querySelector('section')?.getAttribute('data-tone')).toBe(
      'gradient',
    )
  })

  it('wraps the content in a glass panel for the glass tone', () => {
    const { container } = render(
      <MarketingSection id="a" tone="glass">
        panel
      </MarketingSection>,
    )
    const panel = container.querySelector(
      '.kro-marketing-section__panel',
    ) as HTMLElement
    expect(panel.className).toContain('kro-glass')
    expect(panel.textContent).toBe('panel')
  })
})
