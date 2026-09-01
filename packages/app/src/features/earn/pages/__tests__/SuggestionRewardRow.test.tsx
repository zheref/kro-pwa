import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { rewardSuggestions } from '@kro/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SuggestionRewardRow } from '../SuggestionRewardRow'

afterEach(cleanup)

const suggestion = rewardSuggestions[0]
if (suggestion === undefined) {
  throw new Error('fixture: rewardSuggestions is unexpectedly empty')
}

describe('SuggestionRewardRow', () => {
  it('shows the suggestion title, glyph and point cost', () => {
    render(<SuggestionRewardRow reward={suggestion} onAdd={() => {}} />)

    expect(screen.getByText(suggestion.title)).toBeTruthy()
    expect(screen.getByText(suggestion.glyph)).toBeTruthy()
    expect(screen.getByText(`${suggestion.pointsRequired} points`)).toBeTruthy()
  })

  it('raises the suggestion, not a copy, when Add is tapped', () => {
    const onAdd = vi.fn()
    render(<SuggestionRewardRow reward={suggestion} onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(onAdd).toHaveBeenCalledWith(suggestion)
  })

  it('never renders a Claim or delete affordance — a suggestion is not owned yet', () => {
    render(<SuggestionRewardRow reward={suggestion} onAdd={() => {}} />)

    expect(screen.queryByRole('button', { name: 'Claim' })).toBeNull()
    expect(screen.queryByText('Remove from list')).toBeNull()
  })
})
