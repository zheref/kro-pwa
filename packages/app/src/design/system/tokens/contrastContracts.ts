/**
 * WHAT the contrast suite measures, and WHY each pairing exists.
 *
 * KroApple's `KroTokensColorsContrastTests` does not measure every colour
 * against every other colour — that would be meaningless, because a ring
 * gradient is never a label and a page backdrop is never a chip fill. It
 * measures each token in *the ways the app actually paints it*: white on the
 * light fill, black on the dark fill, the tint itself as label text on the
 * page surface, and so on.
 *
 * This module is that idea made explicit and exhaustive. Every declared colour
 * role lands in exactly one of three places:
 *
 *   1. a CONTRACT below, asserted at 4.5:1 (AA text) in both schemes —
 *      including `LABEL_ON_FILL_ROLES`, the saturated action fills that carry
 *      a word directly;
 *   2. `NON_TEXT_ROLES`, asserted at 3:1 (SC 1.4.11, UI boundaries);
 *   3. `UNMEASURED_ROLES`, with a written reason it carries no contrast duty.
 *
 * `contrastContracts.test.ts` proves the three sets partition the palette, so
 * adding a token to `tokens.css` without deciding its contract fails the
 * suite. That is the anti-drift property: a role cannot quietly opt out.
 */

import type { ColorRole, SemanticRole } from './roles'
import { COLOR_ROLE_VARS, SEMANTIC_ROLE_VARS } from './roles'
import { type Theme, directAlias, resolveToken } from './tokenSource'

export const THEMES: readonly Theme[] = ['light', 'dark'] as const

/** Both label colours a chip is painted with, per `KroChip`'s three uses. */
const WHITE_LABEL = '#ffffff'
const BLACK_LABEL = '#000000'
/** Supporting copy in a banner is white at 70%. */
const WHITE_BODY = 'rgb(255 255 255 / 0.7)'

/**
 * Every semantic role — kinds, hosts, statuses, the neutral chip. This is
 * `KroTokens.Colors.all`, and like the Swift list it is the single sequence
 * the regression suite and the Storybook gallery both iterate.
 */
export const CHIP_ROLES: readonly SemanticRole[] = Object.keys(
  SEMANTIC_ROLE_VARS,
) as SemanticRole[]

/** Banner fills — a different contract: always white text, in both schemes. */
export const BANNER_ROLES: readonly ColorRole[] = [
  'bannerWarning',
  'bannerDanger',
]

/**
 * Text roles and the surfaces they are allowed to be painted on.
 *
 * `foreSecondary` lists every surface on purpose. On iOS a recessed surface
 * only ever carries primary text, so KroApple never had to measure the pair;
 * on the web a caption inside a field row is ordinary, and measuring it is
 * what forced this port's one colour adaptation (see `tokens.css`).
 */
export const TEXT_ON_SURFACE: ReadonlyArray<{
  readonly fg: ColorRole
  readonly on: readonly ColorRole[]
}> = [
  { fg: 'fore', on: ['back', 'backInner', 'backNext', 'absolute'] },
  { fg: 'foreSecondary', on: ['back', 'backInner', 'backNext', 'absolute'] },
  { fg: 'total', on: ['absolute'] },
  { fg: 'accent', on: ['back', 'absolute'] },
  { fg: 'onAccent', on: ['accent'] },
]

/**
 * Roles that bound or fill an interactive element without carrying a label.
 * SC 1.4.11's 3:1 applies; SC 1.4.3's 4.5:1 does not.
 *
 * `completeBlue` used to sit here alone with the fill duty. It has moved to
 * `LABEL_ON_FILL_ROLES` below, because the session sheet paints a word on it —
 * and a role sits in exactly one bucket.
 */
export const NON_TEXT_ROLES: ReadonlyArray<{
  readonly role: ColorRole
  readonly on: ColorRole
  readonly why: string
}> = [
  {
    role: 'kroRed',
    on: 'back',
    why: 'destructive affordance fill — always paired with an icon and a word',
  },
]

/**
 * Saturated fills that DO carry a label, and the label colour they carry.
 *
 * The session sheet's three primary actions (KC-IS-#22) paint a word directly
 * on a saturated fill, which is the one thing `CHIP_ROLES` and `BANNER_ROLES`
 * between them did not describe: a chip's label is white in light and black in
 * dark, and a banner's is always white — these are always **black**, in both
 * schemes, because white does not clear the floor on any of the three.
 * Measured from `tokens.css`: white gives 3.65 : 1 on `completeBlue`,
 * 1.92 : 1 on `focusGreen` and 2.27 : 1 on `pastryGreen`; black gives 5.76,
 * 10.9 and 10.3.
 *
 * That is why `focusGreen` and `pastryGreen` are no longer in
 * `UNMEASURED_ROLES`: their old reasons ("the sheet reads its numbers from text
 * roles", "its label is a chip role") stopped being true the moment the sheet
 * shipped (KC-IS-#71 item 16).
 */
export const LABEL_ON_FILL_ROLES: ReadonlyArray<{
  readonly role: ColorRole
  readonly label: string
  readonly why: string
}> = [
  {
    role: 'completeBlue',
    label: BLACK_LABEL,
    why: 'the session conclusion’s "Complete Task" action',
  },
  {
    role: 'focusGreen',
    label: BLACK_LABEL,
    why: 'the session sheet’s "Start Focus Session" / "Start New" action',
  },
  {
    role: 'pastryGreen',
    label: BLACK_LABEL,
    why: 'the conclusion’s "Break" action, and the break phase’s own primary',
  },
]

/**
 * Roles with no contrast duty, each with the reason. A role may only be here
 * because it is a decorative fill, a gradient stop measured through another
 * token, or a value that is itself one of the measured surfaces.
 */
export const UNMEASURED_ROLES: Readonly<Record<string, string>> = {
  eggshell: 'decorative card wash; never carries text',
  mist: 'decorative separator wash; never carries text',
  smoke: 'decorative separator wash; never carries text',
  scotchMist: 'decorative card wash; never carries text',
  athensGray: 'decorative card wash; never carries text',
  payneGray:
    'decorative fill; it happens to share a value with the light accent but carries no label of its own',
  charcoal: 'decorative fill for illustrations and empty-state art',
  cozyBlue:
    'decorative endeavor-list tint; the label on it comes from a chip role',
  celeste:
    'decorative endeavor-list tint; the label on it comes from a chip role',
  melon:
    'decorative endeavor-list tint; the label on it comes from a chip role',
  breakBeige: 'break-session ring stroke; carries no label',
  ringGold:
    'activity-ring stroke; rings are paired with a text counter (epic AC 9)',
  ringEmerald: 'activity-ring stroke; paired with a text counter',
  rewardYellow: 'reward-glyph fill; paired with a numeric label in a text role',
  glowLime: 'the rotating FAB glow; decorative and stilled by reduced motion',
  timelineSelectionOutline:
    'selection outline drawn at 2px over the accent chip — owned by the timeline child (#19)',
  timelineTodaySelectedForeground:
    'the today glyph on the accent-filled selected chip; the accent is user-tunable, so the pair is asserted by the chip that owns it (#19), not here',
  hairline:
    'a translucent row divider, not a boundary of an interactive element',
}

/** One measurement the suite performs. */
export interface MeasuredPair {
  readonly contract: string
  readonly label: string
  readonly theme: Theme
  readonly foreground: string
  readonly background: string
  readonly floor: number
}

const AA_TEXT_FLOOR = 4.5
const AA_NON_TEXT_FLOOR = 3

function colorValue(role: ColorRole, theme: Theme): string {
  return resolveToken(COLOR_ROLE_VARS[role], theme)
}

function semanticValue(role: SemanticRole, theme: Theme): string {
  return resolveToken(SEMANTIC_ROLE_VARS[role], theme)
}

/**
 * Every pairing the suite asserts, resolved from `tokens.css` at call time.
 *
 * Built as data rather than as a pile of `it()` blocks so the Storybook
 * gallery can render the same numbers the test enforces — the gallery and the
 * gate cannot disagree.
 */
export function measuredPairs(): MeasuredPair[] {
  const pairs: MeasuredPair[] = []

  for (const role of CHIP_ROLES) {
    pairs.push({
      contract: 'chip fill, light scheme, white label',
      label: role,
      theme: 'light',
      foreground: WHITE_LABEL,
      background: semanticValue(role, 'light'),
      floor: AA_TEXT_FLOOR,
    })
    pairs.push({
      contract: 'chip fill, dark scheme, black label',
      label: role,
      theme: 'dark',
      foreground: BLACK_LABEL,
      background: semanticValue(role, 'dark'),
      floor: AA_TEXT_FLOOR,
    })
    for (const theme of THEMES) {
      pairs.push({
        contract: 'chip tint as label text on the page surface',
        label: role,
        theme,
        foreground: semanticValue(role, theme),
        background: colorValue('back', theme),
        floor: AA_TEXT_FLOOR,
      })
    }
  }

  for (const role of BANNER_ROLES) {
    for (const theme of THEMES) {
      pairs.push({
        contract: 'banner fill, white title',
        label: role,
        theme,
        foreground: WHITE_LABEL,
        background: colorValue(role, theme),
        floor: AA_TEXT_FLOOR,
      })
      pairs.push({
        contract: 'banner fill, 70% white supporting line',
        label: role,
        theme,
        foreground: WHITE_BODY,
        background: colorValue(role, theme),
        floor: AA_TEXT_FLOOR,
      })
    }
  }

  for (const theme of THEMES) {
    for (const stop of [
      'headerGradientIndigo',
      'headerGradientGrape',
    ] as const) {
      pairs.push({
        contract: 'header date on the fixed indigoGrape gradient',
        label: stop,
        theme,
        foreground: colorValue('headerDate', theme),
        background: colorValue(stop, theme),
        floor: AA_TEXT_FLOOR,
      })
    }

    pairs.push({
      contract: 'today glyph on the selected white timeline chip',
      label: 'timelineTodayForeground',
      theme,
      foreground: colorValue('timelineTodayForeground', theme),
      background: colorValue('snow', theme),
      floor: AA_TEXT_FLOOR,
    })

    for (const { fg, on } of TEXT_ON_SURFACE) {
      for (const surface of on) {
        pairs.push({
          contract: 'text role on surface role',
          label: `${fg} on ${surface}`,
          theme,
          foreground: colorValue(fg, theme),
          background: colorValue(surface, theme),
          floor: AA_TEXT_FLOOR,
        })
      }
    }

    for (const { role, on } of NON_TEXT_ROLES) {
      pairs.push({
        contract: 'UI element boundary (SC 1.4.11)',
        label: `${role} on ${on}`,
        theme,
        foreground: colorValue(role, theme),
        background: colorValue(on, theme),
        floor: AA_NON_TEXT_FLOOR,
      })
    }

    for (const { role, label } of LABEL_ON_FILL_ROLES) {
      pairs.push({
        contract: 'saturated action fill, black label',
        label: role,
        theme,
        foreground: label,
        background: colorValue(role, theme),
        floor: AA_TEXT_FLOOR,
      })
    }
  }

  return pairs
}

/**
 * The base roles a contract actually touches, following *declared* `var()`
 * aliases — never value equality. `snow` and `absolute` are both `#ffffff` in
 * light mode and are still two roles with two duties; measuring one must not
 * excuse the other.
 */
export function rolesUnderContract(): Set<ColorRole> {
  const covered = new Set<ColorRole>()
  const roleForVar = new Map<string, ColorRole>()
  for (const [role, variable] of Object.entries(COLOR_ROLE_VARS)) {
    roleForVar.set(variable, role as ColorRole)
  }

  /** Adds `variable` and everything it aliases through. */
  const note = (variable: string) => {
    let current: string | null = variable
    const seen = new Set<string>()
    while (current !== null && !seen.has(current)) {
      seen.add(current)
      const role = roleForVar.get(current)
      if (role !== undefined) covered.add(role)
      current = directAlias(current)
    }
  }

  for (const role of CHIP_ROLES) note(SEMANTIC_ROLE_VARS[role])
  for (const role of BANNER_ROLES) note(COLOR_ROLE_VARS[role])
  for (const role of [
    'headerDate',
    'headerGradientIndigo',
    'headerGradientGrape',
    'timelineTodayForeground',
    'snow',
    'back',
    'absolute',
  ] as const) {
    note(COLOR_ROLE_VARS[role])
  }
  for (const { fg, on } of TEXT_ON_SURFACE) {
    note(COLOR_ROLE_VARS[fg])
    for (const surface of on) note(COLOR_ROLE_VARS[surface])
  }
  for (const { role } of LABEL_ON_FILL_ROLES) note(COLOR_ROLE_VARS[role])

  return covered
}
