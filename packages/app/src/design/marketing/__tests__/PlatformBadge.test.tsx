import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Globe } from 'lucide-react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PLATFORM_STATUS_TEXT, PlatformBadge } from '../PlatformBadge'

afterEach(cleanup)

describe('PlatformBadge', () => {
  it('puts the status words in the accessible name', () => {
    render(
      <PlatformBadge icon={Globe} label="Web" status="live" href="/my-day" />,
    )
    expect(screen.getByRole('link', { name: 'Web Live' })).toBeTruthy()
  })

  it('has a distinct spoken status for each availability', () => {
    expect(new Set(Object.values(PLATFORM_STATUS_TEXT)).size).toBe(4)
    render(
      <PlatformBadge icon={Globe} label="Watch" status="coming" href="#w" />,
    )
    expect(screen.getByRole('link', { name: 'Watch Coming soon' })).toBeTruthy()
  })

  it('is a button when it has only a handler', () => {
    const onClick = vi.fn()
    render(
      <PlatformBadge
        icon={Globe}
        label="iPhone"
        status="testflight"
        onClick={onClick}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'iPhone TestFlight' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is static text when it has neither href nor handler', () => {
    const { container } = render(
      <PlatformBadge icon={Globe} label="Mac" status="in-progress" />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.textContent).toContain('In progress')
  })
})
