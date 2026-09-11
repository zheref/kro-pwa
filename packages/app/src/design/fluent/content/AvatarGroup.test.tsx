import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AvatarGroup } from './AvatarGroup'

afterEach(cleanup)

const FOUR = [
  'Ada Lovelace',
  'Alan Turing',
  'Grace Hopper',
  'Katherine Johnson',
] as const

describe('AvatarGroup', () => {
  it('spreads the named people by default', () => {
    render(<AvatarGroup names={['Ada Lovelace', 'Alan Turing']} />)

    const group = document.querySelector('[data-slot="avatar-group"]')
    expect(group).toBeTruthy()
    expect(group?.className).toContain('gap-kro-tiny')
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Alan Turing' })).toBeTruthy()
  })

  it('caps at three faces and names the overflow as N more', () => {
    render(<AvatarGroup names={FOUR} />)

    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Alan Turing' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Grace Hopper' })).toBeNull()
    expect(screen.getByRole('img', { name: '2 more' })).toBeTruthy()
    expect(screen.getByText('+2')).toBeTruthy()
  })

  it('shows everyone when the list fits inside max', () => {
    render(<AvatarGroup names={['Ada Lovelace', 'Alan Turing']} max={5} />)

    expect(screen.queryByText(/more/)).toBeNull()
    expect(screen.getByText('AL')).toBeTruthy()
    expect(screen.getByText('AT')).toBeTruthy()
  })

  it('stacks later faces with a token ring, not a hex', () => {
    render(
      <AvatarGroup names={['Ada Lovelace', 'Alan Turing']} layout="stack" />,
    )

    const group = document.querySelector('[data-slot="avatar-group"]')
    expect(group?.className).not.toContain('gap-kro-tiny')
    const items = group?.querySelectorAll(':scope > span')
    expect(items?.[1]?.getAttribute('style')).toContain('margin-inline-start')
    expect(items?.[1]?.getAttribute('style')).toContain('--kro-color-back')
  })
})
