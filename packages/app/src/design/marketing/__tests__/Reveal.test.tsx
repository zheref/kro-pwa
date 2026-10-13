import { act, cleanup, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Reveal } from '../Reveal'
import {
  installFakeObserver,
  stubElementTop,
  stubReducedMotion,
} from './testEnv'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Reveal', () => {
  it('renders visible on the server so no-script readers see the content', () => {
    const html = renderToString(<Reveal>hello</Reveal>)
    expect(html).toContain('kro-reveal')
    expect(html).not.toContain('is-armed')
  })

  it('leaves an element that is already on screen alone', () => {
    const observers = installFakeObserver()
    stubElementTop(100)
    render(<Reveal>on screen</Reveal>)
    expect(screen.getByText('on screen').className).not.toContain('is-armed')
    expect(observers).toHaveLength(0)
  })

  it('arms an element below the fold and reveals it once it intersects', () => {
    const observers = installFakeObserver()
    stubElementTop(5000)
    render(<Reveal delay={120}>below</Reveal>)
    const el = screen.getByText('below')
    expect(el.className).toContain('is-armed')
    expect(el.className).not.toContain('is-visible')
    expect(el.style.getPropertyValue('--kro-reveal-delay')).toBe('120ms')
    expect(observers[0]?.options).toEqual({
      threshold: 0.1,
      rootMargin: '0px 0px -8% 0px',
    })
    act(() => observers[0]?.fire([{ target: el, isIntersecting: true }]))
    expect(el.className).toContain('is-visible')
    expect(observers[0]?.disconnected).toBe(true)
  })

  it('stays armed while the observer reports not-intersecting', () => {
    const observers = installFakeObserver()
    stubElementTop(5000)
    render(<Reveal>still below</Reveal>)
    const el = screen.getByText('still below')
    act(() => observers[0]?.fire([{ target: el, isIntersecting: false }]))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(el.className).not.toContain('is-visible')
  })

  it('forces the content visible if the observer never reports (400ms watchdog)', () => {
    installFakeObserver()
    stubElementTop(5000)
    render(<Reveal>stuck</Reveal>)
    const el = screen.getByText('stuck')
    expect(el.className).not.toContain('is-visible')
    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(el.className).not.toContain('is-visible')
    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(el.className).toContain('is-visible')
  })

  it('is a plain wrapper under reduced motion', () => {
    const observers = installFakeObserver()
    stubReducedMotion(true)
    stubElementTop(5000)
    render(<Reveal as="li">calm</Reveal>)
    const el = screen.getByText('calm')
    expect(el.tagName).toBe('LI')
    expect(el.className).not.toContain('is-armed')
    expect(observers).toHaveLength(0)
  })
})
