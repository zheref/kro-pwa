import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DURATION_SECONDS } from '../layout/chromeLayout'
import {
  TOAST_ICON_COLOR_VAR,
  type ToastIconColor,
  resetActiveToastSequence,
  toActiveToast,
} from './activeToast'

beforeEach(resetActiveToastSequence)

describe('toActiveToast', () => {
  it('gives a plain completion toast canon`s 10-second default', () => {
    const toast = toActiveToast({ message: '"Buy groceries" marked complete' })

    expect(toast.duration).toBe(TOAST_DURATION_SECONDS.default)
  })

  it('respects a caller`s own reading time — the ~8s capture Undo', () => {
    const toast = toActiveToast({ message: 'Added for today', duration: 8 })

    expect(toast.duration).toBe(8)
  })

  it('refuses to flash a toast past faster than it can be read', () => {
    const toast = toActiveToast({ message: 'Saved', duration: 0.4 })

    expect(toast.duration).toBe(TOAST_DURATION_SECONDS.min)
  })

  it('caps a toast that would otherwise camp on the screen', () => {
    const toast = toActiveToast({ message: 'Sync finished', duration: 45 })

    expect(toast.duration).toBe(TOAST_DURATION_SECONDS.max)
  })

  it('mints a fresh id per toast, so two identical messages are two toasts', () => {
    const first = toActiveToast({ message: 'Saved' })
    const second = toActiveToast({ message: 'Saved' })

    expect(first.id).not.toBe(second.id)
  })

  it('keeps everything else the caller handed over', () => {
    const onSelect = vi.fn()
    const toast = toActiveToast({
      message: '"Team meeting" deferred to 3:00 PM',
      icon: 'clock',
      iconColor: 'orange',
      iconSize: 18,
      rewardAmount: 30,
      primaryAction: { title: 'Undo', onSelect },
      secondaryAction: { title: 'View', style: 'prominent', onSelect },
    })

    expect(toast.message).toBe('"Team meeting" deferred to 3:00 PM')
    expect(toast.icon).toBe('clock')
    expect(toast.iconColor).toBe('orange')
    expect(toast.iconSize).toBe(18)
    expect(toast.rewardAmount).toBe(30)
    expect(toast.secondaryAction?.style).toBe('prominent')
  })
})

describe('the semantic icon colours', () => {
  it('covers every case canon defines', () => {
    const cases: ToastIconColor[] = [
      'primary',
      'green',
      'blue',
      'orange',
      'red',
      'yellow',
      'gray',
    ]

    for (const colour of cases) {
      expect(TOAST_ICON_COLOR_VAR[colour]).toBeTypeOf('string')
    }
  })

  it('paints token roles, never literals, so the dark palette carries through', () => {
    for (const value of Object.values(TOAST_ICON_COLOR_VAR)) {
      expect(value).toMatch(/^var\(--kro-/)
    }
  })

  it('maps `primary` to the surface`s own foreground, as canon`s .primary does', () => {
    expect(TOAST_ICON_COLOR_VAR.primary).toBe('var(--kro-color-fore)')
  })
})
