/**
 * The Session Pill (`RC-11`) — the render tests mirroring
 * `SessionPillFragment.stories.tsx`, both built from `sessionPillMocks`.
 *
 * The group worth reading is the last one. Canon does **not** unmount the pill
 * when it is not wanted — it keeps the overlay in the layout and crossfades the
 * opacity, *"so the overlay can crossfade rather than pop"*. A test that only
 * asserted "the pill is absent" would happily pass against an implementation
 * that unmounts it, and the fade would silently disappear. So the hidden state
 * is asserted as a *rendered* state: present, transparent, inert, and out of
 * the accessibility tree.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOAST_LIFT } from '../../../../design/chrome/layout/chromeMotion'
import { pillTrailingPadding } from '../../../../design/chrome/layout/chromeLayout'
import { SessionPillFragment } from '../SessionPillFragment'
import { sessionPillMocks } from '../SessionSurfaceMocks'
import { SESSION_PILL_BOX } from '../sessionSheetModel'

afterEach(cleanup)

const noop = () => {}

const renderPill = (
  pill: (typeof sessionPillMocks)['running'],
  overrides: Partial<Parameters<typeof SessionPillFragment>[0]> = {},
) =>
  render(
    <SessionPillFragment
      pill={pill}
      isVisible
      position="absolute"
      onTapBody={noop}
      onTapPause={noop}
      onTapResume={noop}
      onTapComplete={noop}
      {...overrides}
    />,
  )

describe('states', () => {
  it('shows the endeavor, its glyph and the live remaining time while running', () => {
    renderPill(sessionPillMocks.running)

    expect(
      screen.getByRole('button', { name: '📊 Prepare slides, 15:00' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pause session' })).toBeTruthy()
  })

  it('offers resume, not pause, once the clock is frozen', () => {
    renderPill(sessionPillMocks.paused)

    expect(screen.getByRole('button', { name: 'Resume session' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pause session' })).toBeNull()
  })

  it('says "Break" in place of the endeavor title while a break runs', () => {
    renderPill(sessionPillMocks.onBreak)

    expect(screen.getByRole('button', { name: /^Break, / })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pause session' })).toBeTruthy()
  })

  it('replaces the toggle with Mark complete once the session has concluded', () => {
    renderPill(sessionPillMocks.concluded)

    expect(
      screen.getByRole('button', { name: 'Mark task complete' }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pause session' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resume session' })).toBeNull()
  })

  it('offers no trailing affordance at all when there is no session', () => {
    const { container } = renderPill(sessionPillMocks.hidden, {
      isVisible: false,
    })
    expect(
      container.querySelector('[data-kro-session-pill-affordance]'),
    ).toBeNull()
  })
})

describe('the tint', () => {
  it('takes the focus hue while focus time is accruing', () => {
    const { container } = renderPill(sessionPillMocks.running)
    const pill = container.querySelector(
      '[data-kro-session-pill]',
    ) as HTMLElement

    expect(pill.getAttribute('data-kro-session-pill')).toBe('focus')
    expect(pill.style.backgroundColor).toContain('focus-green')
  })

  it('takes the break hue while a break is accruing', () => {
    const { container } = renderPill(sessionPillMocks.onBreak)
    const pill = container.querySelector(
      '[data-kro-session-pill]',
    ) as HTMLElement

    expect(pill.getAttribute('data-kro-session-pill')).toBe('break')
    expect(pill.style.backgroundColor).toContain('break-beige')
  })

  it('drops its tint entirely while paused, so it recedes into the chrome', () => {
    const { container } = renderPill(sessionPillMocks.paused)
    const pill = container.querySelector(
      '[data-kro-session-pill]',
    ) as HTMLElement

    expect(pill.getAttribute('data-kro-session-pill')).toBe('chrome')
    expect(pill.style.backgroundColor).toBe('')
  })

  it('is untinted at the conclusion too — nothing is advancing', () => {
    const { container } = renderPill(sessionPillMocks.concluded)
    expect(
      (container.querySelector('[data-kro-session-pill]') as HTMLElement).style
        .backgroundColor,
    ).toBe('')
  })
})

describe('intents', () => {
  it('reopens the session surface when the body is tapped', async () => {
    const onTapBody = vi.fn()
    renderPill(sessionPillMocks.running, { onTapBody })

    await userEvent.click(
      screen.getByRole('button', { name: '📊 Prepare slides, 15:00' }),
    )
    expect(onTapBody).toHaveBeenCalledTimes(1)
  })

  it('pauses from the trailing button without reopening anything', async () => {
    const onTapBody = vi.fn()
    const onTapPause = vi.fn()
    renderPill(sessionPillMocks.running, { onTapBody, onTapPause })

    await userEvent.click(screen.getByRole('button', { name: 'Pause session' }))
    expect(onTapPause).toHaveBeenCalledTimes(1)
    expect(onTapBody).not.toHaveBeenCalled()
  })

  it('resumes from the trailing button while paused', async () => {
    const onTapResume = vi.fn()
    renderPill(sessionPillMocks.paused, { onTapResume })

    await userEvent.click(screen.getByRole('button', { name: 'Resume session' }))
    expect(onTapResume).toHaveBeenCalledTimes(1)
  })

  it('closes the endeavor from the checkmark once concluded', async () => {
    const onTapComplete = vi.fn()
    renderPill(sessionPillMocks.concluded, { onTapComplete })

    await userEvent.click(
      screen.getByRole('button', { name: 'Mark task complete' }),
    )
    expect(onTapComplete).toHaveBeenCalledTimes(1)
  })
})

describe('placement and the crossfade', () => {
  it('anchors itself with the chrome kit’s canon insets, not with literals', () => {
    const { container } = renderPill(sessionPillMocks.running)
    const layer = container.querySelector(
      '[data-kro-session-pill-layer]',
    ) as HTMLElement

    expect(layer.style.left).toBe(`${SESSION_PILL_BOX.leading}px`)
    expect(layer.style.right).toBe(`${pillTrailingPadding()}px`)
    expect(layer.style.bottom).toBe(`${SESSION_PILL_BOX.bottom}px`)
  })

  it('hugs its content at the trailing edge instead of stretching the layer', () => {
    const { container } = renderPill(sessionPillMocks.running)
    const layer = container.querySelector(
      '[data-kro-session-pill-layer]',
    ) as HTMLElement
    const pill = container.querySelector(
      '[data-kro-session-pill]',
    ) as HTMLElement

    expect(layer.style.justifyContent).toBe('flex-end')
    expect(pill.className).toContain('max-w-full')
  })

  it('carries its capsule radius inline, because the utility class loses', () => {
    const { container } = renderPill(sessionPillMocks.running)
    const pill = container.querySelector(
      '[data-kro-session-pill]',
    ) as HTMLElement

    // `.kro-glass` declares an unlayered `border-radius`, which beats every
    // Tailwind utility regardless of specificity — so `rounded-kro-pill` would
    // silently render at the 20px surface radius.
    expect(pill.style.borderRadius).toBe('var(--kro-radius-pill)')
    expect(pill.className).not.toContain('rounded-kro-pill')
  })

  it('never takes a pointer on the layer, so the chrome beneath stays clickable', () => {
    const { container } = renderPill(sessionPillMocks.running)
    const layer = container.querySelector(
      '[data-kro-session-pill-layer]',
    ) as HTMLElement
    const pill = container.querySelector(
      '[data-kro-session-pill]',
    ) as HTMLElement

    // The layer is a full-width box with no paint; only the capsule inside it
    // may be hit-tested, or the sidebar and tab bar under it stop working.
    expect(layer.style.pointerEvents).toBe('none')
    expect(pill.style.pointerEvents).toBe('auto')
  })

  it('matches the FAB’s height so the two share a baseline', () => {
    const { container } = renderPill(sessionPillMocks.running)
    expect(
      (container.querySelector('[data-kro-session-pill]') as HTMLElement).style
        .height,
    ).toBe(`${SESSION_PILL_BOX.height}px`)
  })

  it('stays mounted and crossfades out rather than popping', () => {
    const { container } = renderPill(sessionPillMocks.running, {
      isVisible: false,
    })
    const layer = container.querySelector(
      '[data-kro-session-pill-layer]',
    ) as HTMLElement

    // Present — canon keeps the overlay in the layout — but invisible, inert
    // and out of the accessibility tree.
    expect(layer).toBeTruthy()
    expect(layer.style.opacity).toBe('0')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(
      (container.querySelector('[data-kro-session-pill]') as HTMLElement).style
        .pointerEvents,
    ).toBe('none')
    expect(layer.style.transitionDuration).toBe(`${TOAST_LIFT.ms}ms`)
    expect(screen.queryByRole('button', { name: 'Pause session' })).toBeNull()
  })

  it('fades back in with the same 0.22s ease', () => {
    const { container } = renderPill(sessionPillMocks.running)
    const layer = container.querySelector(
      '[data-kro-session-pill-layer]',
    ) as HTMLElement

    expect(layer.style.opacity).toBe('1')
    expect(layer.style.transitionDuration).toBe('220ms')
  })
})
