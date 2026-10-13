import { act, cleanup, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useActiveSection } from '../useActiveSection'
import { installFakeObserver } from './testEnv'

function Probe({
  ids,
  present = ids,
}: {
  readonly ids: string[]
  readonly present?: string[]
}) {
  const active = useActiveSection(ids)
  return (
    <>
      <output>{active ?? 'none'}</output>
      {present.map((id) => (
        <section key={id} id={id} />
      ))}
    </>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useActiveSection', () => {
  it('is null on the server, where there is no observer to ask', () => {
    expect(renderToString(<Probe ids={['a', 'b']} />)).toContain('none')
  })

  it('watches the middle band of the viewport for every id that exists', () => {
    const observers = installFakeObserver()
    render(<Probe ids={['a', 'b', 'missing']} present={['a', 'b']} />)
    expect(observers).toHaveLength(1)
    expect(observers[0]?.options?.rootMargin).toBe('-40% 0px -50% 0px')
    expect(observers[0]?.observed.map((el) => el.id)).toEqual(['a', 'b'])
  })

  it('reports the section that crosses the band and ignores one that leaves it', () => {
    const observers = installFakeObserver()
    render(<Probe ids={['a', 'b']} />)
    const [a, b] = observers[0]?.observed ?? []
    act(() =>
      observers[0]?.fire([{ target: a as Element, isIntersecting: true }]),
    )
    expect(screen.getByRole('status').textContent).toBe('a')
    act(() =>
      observers[0]?.fire([{ target: b as Element, isIntersecting: true }]),
    )
    expect(screen.getByRole('status').textContent).toBe('b')
    act(() =>
      observers[0]?.fire([{ target: b as Element, isIntersecting: false }]),
    )
    expect(screen.getByRole('status').textContent).toBe('b')
  })

  it('disconnects on unmount', () => {
    const observers = installFakeObserver()
    const { unmount } = render(<Probe ids={['a']} />)
    unmount()
    expect(observers[0]?.disconnected).toBe(true)
  })

  it('stays null where IntersectionObserver does not exist', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Probe ids={['a']} />)
    expect(screen.getByRole('status').textContent).toBe('none')
  })
})
