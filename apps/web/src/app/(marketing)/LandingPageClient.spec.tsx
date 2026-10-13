import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingPageClient } from './LandingPageClient'

describe('LandingPageClient (stub)', () => {
  it('renders nothing until the landing page is mounted in piece P2-B', () => {
    const { container } = render(<LandingPageClient />)

    expect(container.innerHTML).toBe('')
  })
})
