/**
 * WCAG 2.2 contrast maths, ported from KroApple's `KroTokensColorsContrastTests`.
 *
 * The Swift original resolves colours through UIKit against a trait
 * collection; there is no such resolver in a Node test, so this module does
 * the same three things by hand — parse an sRGB colour, compute relative
 * luminance (SC 1.4.3's formula), and composite a translucent foreground over
 * an opaque backdrop before measuring.
 *
 * Compositing is not a nicety: a see-through fill's contrast is a property of
 * whatever happens to be behind it, which is exactly why KroApple made the
 * banner fills opaque. Measuring an alpha colour without flattening it first
 * reports a ratio no user will ever see.
 */

export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

const HEX = /^#([0-9a-f]{3,8})$/i
const RGB_FUNCTION = /^rgba?\(([^)]*)\)$/i

function byte(hex: string): number {
  return Number.parseInt(hex, 16) / 255
}

function channel(text: string): number {
  const value = text.trim()
  if (value.endsWith('%')) return Number.parseFloat(value) / 100
  const numeric = Number.parseFloat(value)
  return Number.isNaN(numeric) ? Number.NaN : numeric / 255
}

/**
 * Parses the colour notations `tokens.css` actually uses: hex in 3/4/6/8
 * digits and the space- or comma-separated `rgb()` form with an optional
 * `/ alpha`.
 *
 * Anything else throws. A contrast suite that silently treats an
 * unparseable value as black would report a comfortable ratio for a colour it
 * never understood — the exact failure the Swift original guards with
 * `XCTAssertTrue(c.getRed(...))`.
 */
export function parseColor(value: string): Rgb {
  const text = value.trim()

  const hex = HEX.exec(text)
  if (hex?.[1] !== undefined) {
    const digits = hex[1]
    if (digits.length === 3 || digits.length === 4) {
      const expanded = [...digits].map((d) => d + d)
      return {
        r: byte(expanded[0] as string),
        g: byte(expanded[1] as string),
        b: byte(expanded[2] as string),
        a: expanded[3] === undefined ? 1 : byte(expanded[3]),
      }
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        r: byte(digits.slice(0, 2)),
        g: byte(digits.slice(2, 4)),
        b: byte(digits.slice(4, 6)),
        a: digits.length === 8 ? byte(digits.slice(6, 8)) : 1,
      }
    }
    throw new Error(`not a colour: "${value}"`)
  }

  const fn = RGB_FUNCTION.exec(text)
  if (fn?.[1] !== undefined) {
    const [rgbPart, alphaPart] = fn[1].split('/')
    const parts = (rgbPart as string).trim().split(/[\s,]+/).filter(Boolean)
    if (parts.length < 3) throw new Error(`not a colour: "${value}"`)
    const alphaText = alphaPart ?? parts[3]
    const alpha =
      alphaText === undefined
        ? 1
        : alphaText.trim().endsWith('%')
          ? Number.parseFloat(alphaText) / 100
          : Number.parseFloat(alphaText)
    const parsed = {
      r: channel(parts[0] as string),
      g: channel(parts[1] as string),
      b: channel(parts[2] as string),
      a: alpha,
    }
    if (Number.isNaN(parsed.r) || Number.isNaN(parsed.g) || Number.isNaN(parsed.b)) {
      throw new Error(`not a colour: "${value}"`)
    }
    return parsed
  }

  throw new Error(
    `not a colour this suite can measure: "${value}". Contrast-bearing tokens must be plain sRGB hex or rgb().`,
  )
}

function linearize(component: number): number {
  return component <= 0.03928
    ? component / 12.92
    : ((component + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.2 relative luminance. Alpha is ignored — flatten first. */
export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * linearize(color.r) +
    0.7152 * linearize(color.g) +
    0.0722 * linearize(color.b)
  )
}

/** Source-over compositing of a translucent foreground onto an opaque backdrop. */
export function composite(foreground: Rgb, background: Rgb): Rgb {
  const alpha = foreground.a
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
    a: 1,
  }
}

/** The same colour at a different alpha — for "70% white body copy". */
export function withAlpha(color: Rgb, alpha: number): Rgb {
  return { ...color, a: alpha }
}

/**
 * The WCAG contrast ratio, 1..21.
 *
 * Either side may be translucent; each is flattened onto the other's opaque
 * form first, so callers cannot accidentally measure an unpainted colour.
 */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const opaqueB = b.a >= 1 ? b : composite(b, { r: 1, g: 1, b: 1, a: 1 })
  const opaqueA = a.a >= 1 ? a : composite(a, opaqueB)
  const la = relativeLuminance(opaqueA)
  const lb = relativeLuminance(opaqueB)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Convenience: ratio between two CSS colour strings. */
export function ratioBetween(foreground: string, background: string): number {
  return contrastRatio(parseColor(foreground), parseColor(background))
}

/** WCAG 2.2 SC 1.4.3 — normal-size text. */
export const AA_TEXT = 4.5
/** WCAG 2.2 SC 1.4.11 — UI components and graphical objects. */
export const AA_NON_TEXT = 3

/** Rounded to two places, so failure messages read like the Swift originals. */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100) / 100}:1`
}
