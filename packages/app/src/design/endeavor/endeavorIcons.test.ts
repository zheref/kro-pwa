import { fixedEndeavorsVistas } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { SF_SYMBOL_TO_LUCIDE } from '../system/icons/icons'
import {
  ENDEAVOR_SF_SYMBOL_TO_LUCIDE,
  endeavorIcon,
  iconForBindingSymbol,
  isMappedSymbol,
} from './endeavorIcons'

describe('the kit’s icon extension', () => {
  it('never shadows a row the design system already answers', () => {
    // The whole safety property of splitting the map. A shadowing row would be
    // a second answer to "which glyph is that", which is the failure the single
    // map exists to prevent.
    const systemKeys = new Set(Object.keys(SF_SYMBOL_TO_LUCIDE))
    const shadowed = Object.keys(ENDEAVOR_SF_SYMBOL_TO_LUCIDE).filter((key) =>
      systemKeys.has(key),
    )
    expect(shadowed).toEqual([])
  })

  it('resolves every one of its own rows to a real component', () => {
    for (const name of Object.keys(ENDEAVOR_SF_SYMBOL_TO_LUCIDE)) {
      const Icon = endeavorIcon(name as keyof typeof ENDEAVOR_SF_SYMBOL_TO_LUCIDE)
      expect(typeof Icon, `${name} resolved to nothing`).not.toBe('undefined')
    }
  })

  it('prefers the SYSTEM map for a name both could answer', () => {
    // `checkmark` is the system's. If the kit ever grows a row for it, this
    // catches the shadow before a reviewer has to.
    expect(endeavorIcon('checkmark')).toBe(SF_SYMBOL_TO_LUCIDE.checkmark)
  })
})

describe('binding icons, which arrive as plain strings', () => {
  it('draws every symbol the SHIPPED vista registry names', () => {
    // `EndeavorOperationBinding.icon` is a `string` in the domain, so an
    // unmapped name cannot be a compile error. This is the check that makes it
    // a test failure instead of a question mark in the UI.
    const unmapped: string[] = []
    for (const vista of fixedEndeavorsVistas) {
      for (const binding of vista.capabilities.operations) {
        if (!isMappedSymbol(binding.icon)) unmapped.push(`${vista.id}: ${binding.icon}`)
      }
    }
    expect(unmapped).toEqual([])
  })

  it('degrades an unknown symbol to a visible glyph rather than to undefined', () => {
    const Icon = iconForBindingSymbol('sparkle.magnifyingglass.badge.nonsense')
    expect(typeof Icon).toBe('object')
  })

  it('still answers from the system map when the name is one of its own', () => {
    expect(iconForBindingSymbol('trash')).toBe(SF_SYMBOL_TO_LUCIDE.trash)
  })
})
