import { cleanup, render, screen } from '@testing-library/react'
import { press } from '../../../__tests__/domHelpers'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinalCtaSection } from '../FinalCtaSection'
import * as stories from '../FinalCtaSection.stories'

afterEach(cleanup)

describe('FinalCtaSection (mirrors FinalCtaSection.stories)', () => {
  it('Desktop — "Start your first resolved day." with both doors as links', () => {
    render(stories.Desktop.render())
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Start your first resolved day.',
      }),
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
    ).toBe('#early-access')
  })

  it('Dark — carries the tagline as its eyebrow', () => {
    render(stories.Dark.render())
    expect(screen.getByText('Manage your time, like the gods')).toBeTruthy()
  })

  it('Phone — is a plain div, not an unnamed region landmark', () => {
    const { container } = render(stories.Phone.render())
    expect(container.querySelector('div#start')).not.toBeNull()
    expect(container.querySelector('section#start')).toBeNull()
  })
})

describe('FinalCtaSection intents', () => {
  it('reports the final placement for each door', () => {
    const onOpenHub = vi.fn()
    const onGetEarlyAccess = vi.fn()
    render(
      <FinalCtaSection
        hubUrl="/my-day"
        onOpenHub={onOpenHub}
        onGetEarlyAccess={onGetEarlyAccess}
      />,
    )
    press(screen.getByRole('link', { name: 'Open Kro for Web' }))
    press(screen.getByRole('link', { name: 'Get early access' }))
    expect(onOpenHub).toHaveBeenCalledWith('final')
    expect(onGetEarlyAccess).toHaveBeenCalledWith('final')
  })
})
