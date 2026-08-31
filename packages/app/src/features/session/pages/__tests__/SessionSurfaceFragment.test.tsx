/**
 * The three hosts (`RC-11`).
 *
 * Two of them portal into `document.body`, so these assert through `screen`
 * rather than through the render container — which is also why the two
 * portalled stories are excluded from the story snapshots and covered here
 * instead.
 *
 * Radix's Dialog is safe to mount under jsdom: it carries no popper, and the
 * design system's own note records the measurement
 * (`design/system/primitives/__tests__/radixEnvironment.tsx`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { SessionPhase } from '../../SessionVocabulary'
import { SessionSurfaceFragment } from '../SessionSurfaceFragment'
import {
  SESSION_PRESENTATION_SIZE,
  SessionSurfacePresentation,
} from '../sessionSheetModel'

beforeEach(() => {
  installRadixEnvironment()
})

afterEach(cleanup)

const noop = () => {}

const body = <p>session content</p>

describe('the inline column — the /execute host', () => {
  it('renders the content in place, with no portal and no overlay', () => {
    const { container } = render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.inline}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.ready}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    expect(
      container.querySelector('[data-kro-session-surface="inline"]'),
    ).toBeTruthy()
    expect(screen.getByText('session content')).toBeTruthy()
  })

  it('takes the shell’s pinned session frame rather than a second copy of it', () => {
    const { container } = render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.inline}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.ready}
      >
        {body}
      </SessionSurfaceFragment>,
    )
    const surface = container.querySelector(
      '[data-kro-session-surface="inline"]',
    ) as HTMLElement

    // `min(…, 100%)` rather than a hard floor: canon's minimum is a macOS
    // window frame, and 360px would overflow a 320px phone.
    expect(surface.style.minWidth).toBe(
      `min(${SESSION_PRESENTATION_SIZE.session.minWidth}px, 100%)`,
    )
    expect(surface.style.maxWidth).toBe(
      `${SESSION_PRESENTATION_SIZE.session.maxWidth}px`,
    )
  })

  it('paints canon’s downward tint wash while a session runs, and none when ready', () => {
    const { container, rerender } = render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.inline}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.running}
      >
        {body}
      </SessionSurfaceFragment>,
    )
    const tint = container.querySelector(
      '[data-kro-session-surface-tint]',
    ) as HTMLElement
    expect(tint.style.background).toContain('linear-gradient')
    expect(tint.getAttribute('aria-hidden')).toBe('true')

    rerender(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.inline}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.ready}
      >
        {body}
      </SessionSurfaceFragment>,
    )
    expect(
      container.querySelector('[data-kro-session-surface-tint]'),
    ).toBeNull()
  })
})

describe('the bottom sheet — the handheld host', () => {
  it('presents the content once open', () => {
    render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.sheet}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.running}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    expect(screen.getByText('session content')).toBeTruthy()
    expect(
      document.querySelector('[data-kro-session-surface="sheet"]'),
    ).toBeTruthy()
  })

  it('presents nothing at all while closed', () => {
    render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.sheet}
        isOpen={false}
        onRequestClose={noop}
        phase={SessionPhase.running}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    expect(screen.queryByText('session content')).toBeNull()
  })

  it('asks to close on Escape, and leaves the decision to its caller', async () => {
    const onRequestClose = vi.fn()
    render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.sheet}
        isOpen
        onRequestClose={onRequestClose}
        phase={SessionPhase.running}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onRequestClose).toHaveBeenCalledTimes(1)
  })

  it('carries no close button of its own — the content brings canon’s', () => {
    render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.sheet}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.running}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })
})

describe('the desktop modal', () => {
  it('presents at the shell’s pinned frame', () => {
    render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.modal}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.concluded}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    const surface = document.querySelector(
      '[data-kro-session-surface="modal"]',
    ) as HTMLElement
    // `min(…, 100%)` rather than a hard floor: canon's minimum is a macOS
    // window frame, and 360px would overflow a 320px phone.
    expect(surface.style.minWidth).toBe(
      `min(${SESSION_PRESENTATION_SIZE.session.minWidth}px, 100%)`,
    )
    expect(surface.style.maxWidth).toBe(
      `${SESSION_PRESENTATION_SIZE.session.maxWidth}px`,
    )
  })

  it('names the surface for assistive technology without showing a heading', () => {
    render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.modal}
        isOpen
        onRequestClose={noop}
        phase={SessionPhase.concluded}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    expect(screen.getByRole('dialog', { name: 'Focus session' })).toBeTruthy()
  })

  it('asks to close when the user dismisses it', async () => {
    const onRequestClose = vi.fn()
    render(
      <SessionSurfaceFragment
        presentation={SessionSurfacePresentation.modal}
        isOpen
        onRequestClose={onRequestClose}
        phase={SessionPhase.concluded}
      >
        {body}
      </SessionSurfaceFragment>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onRequestClose).toHaveBeenCalledTimes(1)
  })
})
