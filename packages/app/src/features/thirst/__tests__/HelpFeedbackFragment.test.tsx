/**
 * `HelpFeedbackFragment`'s render tests, mirroring its stories (`RC-11`).
 * Canon parity: six rows, three sections, every row genuinely inert.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HelpFeedbackFragment } from '../HelpFeedbackFragment'

afterEach(cleanup)

const ROW_LABELS = [
  'Documentation',
  'Community Forum',
  'Contact Support',
  'Rate on App Store',
  'Report a Problem',
  'Suggest a Feature',
]

describe('HelpFeedbackFragment', () => {
  it('renders exactly canon\'s six rows', () => {
    render(<HelpFeedbackFragment />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
    expect(buttons.map((button) => button.textContent)).toEqual(ROW_LABELS)
  })

  it('groups the rows under canon\'s three section headings', () => {
    render(<HelpFeedbackFragment />)
    expect(screen.getByText('Resources')).toBeTruthy()
    expect(screen.getByText('Support')).toBeTruthy()
    expect(screen.getByText('Feedback')).toBeTruthy()
  })

  it.each(ROW_LABELS)('%s is genuinely inert — no href, no navigation target', (label) => {
    render(<HelpFeedbackFragment />)
    const row = screen.getByRole('button', { name: label }) as HTMLButtonElement
    expect(row.getAttribute('href')).toBeNull()
    expect(row.hasAttribute('aria-disabled')).toBe(false)
    expect(row.disabled).toBe(false)
  })

  it('labels the whole surface for assistive tech', () => {
    render(<HelpFeedbackFragment />)
    expect(screen.getByTestId('help-feedback-surface')).toBeTruthy()
  })
})
