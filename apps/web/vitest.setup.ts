import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest runs without globals, so Testing Library's automatic cleanup is not
// installed for us. Unmount between tests or the jsdom document leaks state
// from one test into the next.
afterEach(() => {
  cleanup()
})
