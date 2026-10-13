import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import * as stories from '../FederationSection.stories'

afterEach(cleanup)

describe('FederationSection (mirrors FederationSection.stories)', () => {
  it('Desktop — the canon title, eight cards, subtle tone', () => {
    const { container } = render(stories.Desktop.render())
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Kro is a federation, not an island',
      }),
    ).toBeTruthy()
    expect(container.querySelectorAll('article')).toHaveLength(8)
    expect(
      container.querySelector('section#federation')?.getAttribute('data-tone'),
    ).toBe('subtle')
  })

  it('Dark — the four available integrations are described; the four next ones say "Coming next." in words', () => {
    render(stories.Dark.render())
    expect(
      screen.getByText('Sign in to Kro — sync your plans across devices.'),
    ).toBeTruthy()
    expect(screen.getAllByText('Coming next.')).toHaveLength(4)
    for (const name of [
      'Apple Calendar',
      'Apple Reminders',
      'Google Calendar',
      'Google Tasks',
      'Microsoft To Do',
      'GitHub',
      'Jira',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeTruthy()
    }
  })

  it('Phone — text only: no image, so no third-party logo is shown', () => {
    const { container } = render(stories.Phone.render())
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})
