import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { colorVar } from '../../system/tokens/roles'
import {
  Avatar,
  PresenceBadge,
  PRESENCE_KINDS,
  avatarSizePx,
  initialsFromName,
  presenceLabel,
} from './Avatar'

afterEach(cleanup)

const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

describe('initialsFromName', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsFromName('Ada Lovelace')).toBe('AL')
    expect(initialsFromName('mary ann evans')).toBe('MA')
  })

  it('uses a single letter when there is only one word', () => {
    expect(initialsFromName('Madonna')).toBe('M')
  })

  it('returns a question mark for an empty name', () => {
    expect(initialsFromName('')).toBe('?')
    expect(initialsFromName('   ')).toBe('?')
  })
})

describe('presenceLabel', () => {
  it('keeps a single-word presence as the spoken word', () => {
    expect(presenceLabel('available')).toBe('available')
    expect(presenceLabel('away')).toBe('away')
  })

  it('turns hyphens into spaces so the badge is not colour alone', () => {
    expect(presenceLabel('do-not-disturb')).toBe('do not disturb')
    expect(presenceLabel('out-of-office')).toBe('out of office')
  })

  it('names every presence kind', () => {
    for (const kind of PRESENCE_KINDS) {
      expect(presenceLabel(kind).length).toBeGreaterThan(0)
    }
  })
})

describe('avatarSizePx', () => {
  it('defaults to 32', () => {
    expect(avatarSizePx()).toBe(32)
  })

  it('returns the named size in pixels', () => {
    expect(avatarSizePx(16)).toBe(16)
    expect(avatarSizePx(72)).toBe(72)
    expect(avatarSizePx(128)).toBe(128)
  })
})

describe('PresenceBadge', () => {
  it('names available in words and paints with focusGreen', () => {
    render(
      <span className="relative">
        <PresenceBadge presence="available" />
      </span>,
    )

    const badge = screen.getByLabelText('available')
    expect(badge.getAttribute('data-slot')).toBe('presence-badge')
    expect(badge.style.backgroundColor).toBe(colorVar('focusGreen'))
  })

  it('maps away, busy and do-not-disturb onto named tokens', () => {
    const { rerender } = render(<PresenceBadge presence="away" />)
    expect(screen.getByLabelText('away').style.backgroundColor).toBe(
      colorVar('rewardYellow'),
    )

    rerender(<PresenceBadge presence="busy" />)
    expect(screen.getByLabelText('busy').style.backgroundColor).toBe(
      colorVar('bannerDanger'),
    )

    rerender(<PresenceBadge presence="do-not-disturb" />)
    const dnd = screen.getByLabelText('do not disturb')
    expect(dnd.style.backgroundColor).toBe(colorVar('kroRed'))
  })

  it('is a 10px dot for offline, out of office and unknown', () => {
    const { rerender } = render(<PresenceBadge presence="offline" />)
    const offline = screen.getByLabelText('offline')
    expect(offline.style.width).toBe('10px')
    expect(offline.style.height).toBe('10px')
    expect(offline.style.backgroundColor).toBe(colorVar('payneGray'))

    rerender(<PresenceBadge presence="out-of-office" />)
    expect(screen.getByLabelText('out of office').style.backgroundColor).toBe(
      colorVar('badgePurple'),
    )

    rerender(<PresenceBadge presence="unknown" />)
    expect(screen.getByLabelText('unknown').style.backgroundColor).toBe(
      colorVar('mist'),
    )
  })
})

describe('Avatar', () => {
  it('shows initials from the name and exposes that name', () => {
    render(<Avatar name="Ada Lovelace" />)

    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' })
    expect(avatar.getAttribute('data-slot')).toBe('avatar')
    expect(avatar.querySelector('.kro-fluent-avatar')).toBeTruthy()
    expect(screen.getByText('AL')).toBeTruthy()
    expect(avatar.getAttribute('style')).toContain('32px')
  })

  it('lets initials override the derived letters', () => {
    render(<Avatar name="Ada Lovelace" initials="X" />)

    expect(screen.getByText('X')).toBeTruthy()
    expect(screen.queryByText('AL')).toBeNull()
  })

  it('uses a decorative image and falls back to initials on error', () => {
    render(<Avatar name="Ada Lovelace" image={PIXEL} />)

    const img = document.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('')
    expect(screen.queryByText('AL')).toBeNull()

    fireEvent.error(img as HTMLImageElement)

    expect(screen.getByText('AL')).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
  })

  it('paints brand and neutral from tokens, not a hex', () => {
    const { rerender } = render(<Avatar name="Ada Lovelace" />)
    let face = document.querySelector('.kro-fluent-avatar')
    expect(face?.className).toContain('bg-kro-accent')
    expect(face?.className).toContain('text-kro-on-accent')

    rerender(<Avatar name="Ada Lovelace" color="neutral" />)
    face = document.querySelector('.kro-fluent-avatar')
    expect(face?.className).toContain('bg-kro-back-inner')
    expect(face?.className).toContain('text-kro-fore')
  })

  it('hashes colourful fills and still shows initials', () => {
    render(<Avatar name="Ada Lovelace" color="colorful" />)

    const face = document.querySelector('.kro-fluent-avatar')
    expect(screen.getByText('AL')).toBeTruthy()
    expect(face?.getAttribute('style')).toContain('--kro-color-badge-')
    expect(face?.getAttribute('style')).toContain('--kro-color-absolute')

    const first = face?.getAttribute('style')
    cleanup()
    render(<Avatar name="Ada Lovelace" color="colorful" />)
    expect(
      document.querySelector('.kro-fluent-avatar')?.getAttribute('style'),
    ).toBe(first)
  })

  it('squares the face when asked and keeps a circular default', () => {
    const { rerender } = render(<Avatar name="Ada Lovelace" />)
    expect(document.querySelector('.kro-fluent-avatar')?.className).toContain(
      'rounded-full',
    )

    rerender(<Avatar name="Ada Lovelace" shape="square" />)
    expect(document.querySelector('.kro-fluent-avatar')?.className).toContain(
      'rounded-kro-small',
    )
  })

  it('places a named presence badge on the avatar', () => {
    render(<Avatar name="Ada Lovelace" presence="available" />)

    expect(screen.getByLabelText('available')).toBeTruthy()
    expect(
      document
        .querySelector('[data-slot="presence-badge"]')
        ?.getAttribute('aria-label'),
    ).toBe('available')
  })
})
