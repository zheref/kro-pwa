/**
 * The anti-drift test: `roles.ts` and `tokens.css` must name the same set of
 * tokens, in both directions. A hex added to the stylesheet with no role, or a
 * role pointing at a property nobody declares, fails here rather than
 * resolving to nothing in a browser.
 */

import { describe, expect, it } from 'vitest'
import {
  COLOR_ROLES,
  COLOR_ROLE_VARS,
  DISABLED_OPACITY,
  DISABLED_OPACITY_VAR,
  RADIUS_VARS,
  SEMANTIC_ROLES,
  SEMANTIC_ROLE_VARS,
  SHADOW_VARS,
  SIZE_VARS,
  SPACING_VARS,
  colorVar,
  radiusVar,
  semanticVar,
  shadowVar,
  spacingVar,
} from './roles'
import { declaredTokenNames, resolveToken } from './tokenSource'

const declared = declaredTokenNames()

function declaredWithPrefix(prefix: string): string[] {
  return declared.filter((name) => name.startsWith(prefix)).sort()
}

function mapped(map: Readonly<Record<string, string>>): string[] {
  return Object.values(map).sort()
}

describe('every TypeScript role resolves to a declared custom property', () => {
  const maps: ReadonlyArray<[string, Readonly<Record<string, string>>]> = [
    ['COLOR_ROLE_VARS', COLOR_ROLE_VARS],
    ['SEMANTIC_ROLE_VARS', SEMANTIC_ROLE_VARS],
    ['SPACING_VARS', SPACING_VARS],
    ['RADIUS_VARS', RADIUS_VARS],
    ['SHADOW_VARS', SHADOW_VARS],
    ['SIZE_VARS', SIZE_VARS],
  ]

  for (const [name, map] of maps) {
    it(`${name} names nothing tokens.css does not declare`, () => {
      const missing = Object.entries(map)
        .filter(([, variable]) => !declared.includes(variable))
        .map(([role, variable]) => `${role} -> ${variable}`)
      expect(missing).toEqual([])
    })
  }

  it('names the disabled-opacity token', () => {
    expect(declared).toContain(DISABLED_OPACITY_VAR)
  })
})

describe('every declared custom property has a TypeScript role', () => {
  it('covers the whole --kro-color-* family', () => {
    expect(declaredWithPrefix('--kro-color-')).toEqual(mapped(COLOR_ROLE_VARS))
  })

  it('covers the whole --kro-role-* family', () => {
    expect(declaredWithPrefix('--kro-role-')).toEqual(
      mapped(SEMANTIC_ROLE_VARS),
    )
  })

  it('covers the whole --kro-space-* family', () => {
    expect(declaredWithPrefix('--kro-space-')).toEqual(mapped(SPACING_VARS))
  })

  it('covers the whole --kro-radius-* family', () => {
    expect(declaredWithPrefix('--kro-radius-')).toEqual(mapped(RADIUS_VARS))
  })

  it('covers the whole --kro-shadow-* family', () => {
    expect(declaredWithPrefix('--kro-shadow-')).toEqual(mapped(SHADOW_VARS))
  })

  it('covers the whole --kro-size-* family', () => {
    expect(declaredWithPrefix('--kro-size-')).toEqual(mapped(SIZE_VARS))
  })
})

describe('the scales carry KroApple’s numbers', () => {
  it('spaces on the 4pt rhythm — 4/8/16/24/32/48', () => {
    expect(
      Object.keys(SPACING_VARS).map((key) =>
        resolveToken(SPACING_VARS[key as keyof typeof SPACING_VARS], 'light'),
      ),
    ).toEqual(['4px', '8px', '16px', '24px', '32px', '48px'])
  })

  it('radii are small 8 / field 12 / card 12 / surface 20 / large 20 / pill', () => {
    expect(resolveToken(RADIUS_VARS.small, 'light')).toBe('8px')
    expect(resolveToken(RADIUS_VARS.field, 'light')).toBe('12px')
    expect(resolveToken(RADIUS_VARS.card, 'light')).toBe('12px')
    expect(resolveToken(RADIUS_VARS.surface, 'light')).toBe('20px')
    expect(resolveToken(RADIUS_VARS.large, 'light')).toBe('20px')
    // SwiftUI's `.infinity`; on the web a capsule is a large finite radius.
    expect(resolveToken(RADIUS_VARS.pill, 'light')).toBe('9999px')
  })

  it('keeps the 44pt touch floor and adds the 28px pointer target the epic asks for', () => {
    expect(resolveToken(SIZE_VARS.minTouchTarget, 'light')).toBe('44px')
    expect(resolveToken(SIZE_VARS.fieldMinHeight, 'light')).toBe('44px')
    expect(resolveToken(SIZE_VARS.minPointerTarget, 'light')).toBe('28px')
    expect(resolveToken(SIZE_VARS.rowIconColumn, 'light')).toBe('22px')
  })

  it('fades a disabled control to exactly 0.62 — once, never twice', () => {
    expect(resolveToken(DISABLED_OPACITY_VAR, 'light')).toBe(
      String(DISABLED_OPACITY),
    )
  })

  it('ports the shadow recipes 1:1 in light and only deepens their alpha in dark', () => {
    expect(resolveToken(SHADOW_VARS.subtle, 'light')).toBe(
      '0 2px 8px rgb(0 0 0 / 0.08)',
    )
    expect(resolveToken(SHADOW_VARS.card, 'light')).toBe(
      '0 4px 20px rgb(0 0 0 / 0.14)',
    )
    expect(resolveToken(SHADOW_VARS.surface, 'light')).toBe(
      '0 3px 12px rgb(0 0 0 / 0.06)',
    )
    // Same geometry in dark; only the alpha moves, so elevation stays visible.
    for (const role of ['subtle', 'card', 'surface'] as const) {
      const light = resolveToken(SHADOW_VARS[role], 'light')
      const dark = resolveToken(SHADOW_VARS[role], 'dark')
      expect(dark.split('rgb')[0]).toBe(light.split('rgb')[0])
      expect(dark).not.toBe(light)
    }
  })
})

describe('the var() helpers', () => {
  it('wrap a role in the reference a style prop can use', () => {
    expect(colorVar('back')).toBe('var(--kro-color-back)')
    expect(semanticVar('kindHabit')).toBe('var(--kro-role-kind-habit)')
    expect(spacingVar('medium')).toBe('var(--kro-space-medium)')
    expect(radiusVar('surface')).toBe('var(--kro-radius-surface)')
    expect(shadowVar('card')).toBe('var(--kro-shadow-card)')
  })

  it('exposes the role lists the gallery and the suite both iterate', () => {
    expect(COLOR_ROLES.length).toBe(Object.keys(COLOR_ROLE_VARS).length)
    expect(SEMANTIC_ROLES.length).toBe(22)
  })
})
