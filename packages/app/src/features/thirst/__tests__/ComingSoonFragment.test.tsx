/**
 * `ComingSoonFragment`'s render tests, mirroring its stories 1:1 (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComingSoonFragment } from '../ComingSoonFragment'

afterEach(cleanup)

describe('ComingSoonFragment', () => {
  it('shows the count and platform breakdown when votable', () => {
    render(
      <ComingSoonFragment
        featureTitle="Priority Matrix"
        featureBlurb="Sort what matters by urgency and importance."
        status={{ kind: 'votable' }}
        hasCounts
        totalCount={42}
        perPlatform={[
          { platform: 'ios', count: 30 },
          { platform: 'android', count: 12 },
        ]}
        isVoting={false}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Priority Matrix',
    )
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByRole('button', { name: /vote to get it sooner/i })).toBeTruthy()
  })

  it('shows the voted chip and no vote CTA once voted', () => {
    render(
      <ComingSoonFragment
        featureTitle="Habits"
        status={{ kind: 'voted' }}
        hasCounts
        totalCount={43}
        perPlatform={[{ platform: 'ios', count: 31 }]}
        isVoting={false}
      />,
    )

    expect(screen.getByText('You voted')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /vote to get it sooner/i }),
    ).toBeNull()
  })

  it('shows a loading indicator and no count block while loading', () => {
    render(
      <ComingSoonFragment
        featureTitle="Board"
        status={{ kind: 'loading' }}
        hasCounts={false}
        totalCount={0}
        perPlatform={[]}
        isVoting={false}
      />,
    )

    expect(screen.getByRole('status', { name: /loading votes/i })).toBeTruthy()
    expect(screen.queryByText('42')).toBeNull()
  })

  it('explains why voting is unavailable and disables the CTA when signed out', () => {
    render(
      <ComingSoonFragment
        featureTitle="Blueprints"
        status={{ kind: 'unavailable', message: 'Sign in to vote for upcoming features.' }}
        hasCounts
        totalCount={17}
        perPlatform={[{ platform: 'ios', count: 17 }]}
        isVoting={false}
      />,
    )

    expect(screen.getByText('Sign in to vote for upcoming features.')).toBeTruthy()
    const cta = screen.getByRole('button', {
      name: /vote to get it sooner/i,
    }) as HTMLButtonElement
    expect(cta.disabled).toBe(true)
  })

  it('hides the count and any counts block when offline and nothing has loaded', () => {
    render(
      <ComingSoonFragment
        featureTitle="Blueprints"
        status={{ kind: 'unavailable', message: 'No internet connection. Please try again.' }}
        hasCounts={false}
        totalCount={0}
        perPlatform={[]}
        isVoting={false}
      />,
    )

    expect(screen.getByText('No internet connection. Please try again.')).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
  })

  it('renders the plain card with no vote affordance for an unmapped dead-end', () => {
    render(
      <ComingSoonFragment
        featureTitle="Unknown"
        status={{ kind: 'notVotable' }}
        hasCounts={false}
        totalCount={0}
        perPlatform={[]}
        isVoting={false}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Unknown')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('disables the CTA and shows a spinner glyph while a vote is in flight', () => {
    render(
      <ComingSoonFragment
        featureTitle="Priority Matrix"
        status={{ kind: 'votable' }}
        hasCounts
        totalCount={42}
        perPlatform={[]}
        isVoting
      />,
    )

    const cta = screen.getByRole('button', {
      name: /vote to get it sooner/i,
    }) as HTMLButtonElement
    expect(cta.disabled).toBe(true)
  })

  it('calls onVote when the CTA is tapped while votable', () => {
    const onVote = vi.fn()
    render(
      <ComingSoonFragment
        featureTitle="Priority Matrix"
        status={{ kind: 'votable' }}
        hasCounts
        totalCount={42}
        perPlatform={[]}
        isVoting={false}
        onVote={onVote}
      />,
    )

    screen.getByRole('button', { name: /vote to get it sooner/i }).click()
    expect(onVote).toHaveBeenCalledTimes(1)
  })

  it('shows a transient vote-error message alongside the still-enabled CTA', () => {
    render(
      <ComingSoonFragment
        featureTitle="Priority Matrix"
        status={{ kind: 'votable' }}
        hasCounts
        totalCount={42}
        perPlatform={[]}
        isVoting={false}
        voteErrorMessage="Couldn't record that vote. Try again."
      />,
    )

    expect(screen.getByText("Couldn't record that vote. Try again.")).toBeTruthy()
    const cta = screen.getByRole('button', {
      name: /vote to get it sooner/i,
    }) as HTMLButtonElement
    expect(cta.disabled).toBe(false)
  })
})
