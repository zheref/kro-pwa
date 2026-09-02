import { afterEach, describe, expect, it } from 'vitest'
import { PALETTE_ATTRIBUTE } from '../../../design/system/tokens/appPalette'
import { THEME_ATTRIBUTE } from '../../../design/system/tokens/readToken'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  applyStoredAppearance,
  storedAppearanceKey,
} from '../applyStoredAppearance'

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  document.documentElement.removeAttribute(PALETTE_ATTRIBUTE)
})

describe('applyStoredAppearance', () => {
  it('paints a stored dark theme onto the document', () => {
    const localStore = makeInMemoryLocalStore({
      preferences: { 'kro:general.appearance': 'dark' },
    })

    applyStoredAppearance(localStore)

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
  })

  it('paints a stored palette onto the document', () => {
    const localStore = makeInMemoryLocalStore({
      preferences: { 'kro:general.palette': 'green' },
    })

    applyStoredAppearance(localStore)

    expect(document.documentElement.getAttribute(PALETTE_ATTRIBUTE)).toBe(
      'green',
    )
  })

  it('falls back to system + purple when the store is empty', () => {
    applyStoredAppearance(makeInMemoryLocalStore({}))

    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false)
    expect(document.documentElement.getAttribute(PALETTE_ATTRIBUTE)).toBe(
      'purple',
    )
  })

  it('gives the same key for the same stored pair, so a subscriber can no-op', () => {
    const localStore = makeInMemoryLocalStore({
      preferences: {
        'kro:general.appearance': 'dark',
        'kro:general.palette': 'green',
      },
    })

    const first = applyStoredAppearance(localStore)
    const second = applyStoredAppearance(localStore)
    expect(storedAppearanceKey(first)).toBe(storedAppearanceKey(second))
    expect(storedAppearanceKey(first)).toBe('dark|green')
  })
})
