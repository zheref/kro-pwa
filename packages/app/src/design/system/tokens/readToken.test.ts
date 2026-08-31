import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_ATTRIBUTE,
  readColorRole,
  readSemanticRole,
  readToken,
  resolveTheme,
  setThemePreference,
} from './readToken'

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  document.documentElement.style.cssText = ''
  vi.unstubAllGlobals()
})

describe('readToken', () => {
  it('reads a custom property the element actually carries', () => {
    document.documentElement.style.setProperty('--kro-color-back', '#fafafa')
    expect(readToken('--kro-color-back')).toBe('#fafafa')
  })

  it('reads from a scoped element rather than the root when given one', () => {
    const scope = document.createElement('div')
    scope.style.setProperty('--kro-color-accent', '#663399')
    document.body.append(scope)

    expect(readToken('--kro-color-accent', scope)).toBe('#663399')
    scope.remove()
  })

  it('returns empty for a property nobody declared, instead of a stale value', () => {
    expect(readToken('--kro-color-not-a-role')).toBe('')
  })

  it('maps a base role and a semantic role to their properties', () => {
    document.documentElement.style.setProperty('--kro-color-badge-blue', '#1a5bc7')
    document.documentElement.style.setProperty('--kro-role-kind-task', '#1a5bc7')

    expect(readColorRole('badgeBlue')).toBe('#1a5bc7')
    expect(readSemanticRole('kindTask')).toBe('#1a5bc7')
  })
})

describe('resolveTheme', () => {
  it('honours an explicit attribute over the OS preference', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true } as MediaQueryList),
    )
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'light')

    expect(resolveTheme()).toBe('light')
  })

  it('falls back to the OS preference when no attribute is set', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true } as MediaQueryList),
    )

    expect(resolveTheme()).toBe('dark')
  })

  it('ignores an attribute value the stylesheet does not understand', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    )
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'sepia')

    expect(resolveTheme()).toBe('light')
  })
})

describe('setThemePreference', () => {
  it('pins dark', () => {
    setThemePreference('dark')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
  })

  it('pins light — which the stylesheet reads as "opt out of the dark media query"', () => {
    setThemePreference('light')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('light')
  })

  it('hands the choice back to the OS by removing the attribute entirely', () => {
    setThemePreference('dark')
    setThemePreference('system')
    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false)
  })
})
