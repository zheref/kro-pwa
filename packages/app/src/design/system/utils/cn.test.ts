import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins plain class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy conditions instead of emitting "false" or "undefined"', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('flattens arrays and objects, the way a variant map hands them over', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c')
  })

  it('lets a caller override a component default — the reason twMerge is here', () => {
    // Source order in the stylesheet decides this without the merge, which is
    // how `<Button className="p-0">` ends up silently padded.
    expect(cn('p-2', 'p-0')).toBe('p-0')
    expect(cn('rounded-md', 'rounded-full')).toBe('rounded-full')
  })

  it('leaves the kro-* material classes alone — they conflict with nothing', () => {
    expect(cn('kro-glass', 'kro-glass--control', 'p-2')).toBe(
      'kro-glass kro-glass--control p-2',
    )
  })

  it('returns an empty string when handed nothing', () => {
    expect(cn()).toBe('')
  })
})
