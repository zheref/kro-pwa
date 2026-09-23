/**
 * Popover.
 *
 * NOTHING HERE MOUNTS THE PANEL. Mounting a Radix popper under jsdom costs
 * seconds of wall time per mount — the measurement and everything it was
 * bisected against are recorded in `__tests__/radixEnvironment.tsx`. Paying it
 * once per assertion made the whole `make test` gate red, not merely slow.
 *
 * So the split is: this file asserts what this repo actually owns — the
 * trigger's ARIA, the open/closed contract, the canonical sizes and the token
 * theming — and the panel on screen belongs to the Storybook test-runner
 * (`pnpm --filter @kro/web test:storybook`), which drives a real browser where
 * placement is both cheap and meaningful. That runner is wired but is not part
 * of `make test` and has not been executed yet.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  POPOVER_CLASSES,
  POPOVER_SIZE,
  Popover,
  PopoverTrigger,
} from './popover'

afterEach(cleanup)

describe('Popover', () => {
  it('renders its trigger as a button that reports it is collapsed', () => {
    render(
      <Popover>
        <PopoverTrigger>Visibility</PopoverTrigger>
      </Popover>,
    )

    const trigger = screen.getByRole('button', { name: 'Visibility' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
  })

  it('opens on the trigger and says so', () => {
    const onOpenChange = vi.fn()
    render(
      <Popover onOpenChange={onOpenChange}>
        <PopoverTrigger>Visibility</PopoverTrigger>
      </Popover>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Visibility' }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(
      screen
        .getByRole('button', { name: 'Visibility' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('closes again on a second press', () => {
    const onOpenChange = vi.fn()
    render(
      <Popover defaultOpen onOpenChange={onOpenChange}>
        <PopoverTrigger>Visibility</PopoverTrigger>
      </Popover>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Visibility' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders no panel while closed', () => {
    render(
      <Popover>
        <PopoverTrigger>Visibility</PopoverTrigger>
      </Popover>,
    )

    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull()
  })
})

describe('the panel’s theming contract', () => {
  it('asks glass.css for the material rather than a background of its own', () => {
    expect(POPOVER_CLASSES.content).toContain('kro-glass')
    expect(POPOVER_CLASSES.content).toContain('kro-popover')
    expect(POPOVER_CLASSES.content).not.toMatch(/\bbg-(?!kro-)/)
  })

  it('uses a token utility for padding, never a raw length', () => {
    expect(POPOVER_CLASSES.content).toContain('p-kro-medium')
    expect(POPOVER_CLASSES.content).not.toMatch(/\bp-\[\d/)
  })

  it('shares the sidebar light rim instead of a clipped stroke', () => {
    expect(POPOVER_CLASSES.content).not.toContain('kro-popover-plate')
    expect(POPOVER_CLASSES.content).not.toContain('kro-popover-rim')
  })

  it('grows from the side Radix positioned it on', () => {
    expect(POPOVER_CLASSES.content).toContain(
      'origin-(--radix-popover-content-transform-origin)',
    )
  })

  it('keeps the pointer tip out of the panel — the rim is the glass edge', () => {
    expect(POPOVER_CLASSES.content).not.toContain('fill-')
  })
})

describe('POPOVER_SIZE', () => {
  it('carries KroApple’s canonical macOS popover sizes, not four guesses', () => {
    expect(POPOVER_SIZE.inbox).toEqual({ width: 560, height: 620 })
    expect(POPOVER_SIZE.visibility).toEqual({ width: 460, height: 560 })
    expect(POPOVER_SIZE.profile).toEqual({ width: 300 })
    expect(POPOVER_SIZE.doNotifications).toEqual({ width: 380, minHeight: 440 })
  })

  it('names every surface the epic lists, and no others', () => {
    expect(Object.keys(POPOVER_SIZE).sort()).toEqual([
      'doNotifications',
      'inbox',
      'profile',
      'visibility',
    ])
  })
})
