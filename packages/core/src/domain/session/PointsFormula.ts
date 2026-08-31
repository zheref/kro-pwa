/**
 * `PointsFormula` — canon `KroCore/Model/PointsFormula.swift`.
 *
 * Which scoring path awards a completion. A user preference (Earn Preferences
 * → Points formula, stored under `earn.pointsFormula`), read fresh at every
 * award so a change applies to the next completion immediately
 * (`docs/Features/Performances.md` § Points formula preference).
 */

export const PointsFormula = {
  /** The canonical default — points scale with how much of the target ran. */
  slidingScale: 'slidingScale',
  /** Metadata-only: estimate × urgency, with no duration scaling. */
  legacy: 'legacy',
} as const

export type PointsFormula = (typeof PointsFormula)[keyof typeof PointsFormula]

/** `CaseIterable`, in canon declaration order. */
export const pointsFormulas: readonly PointsFormula[] = [
  PointsFormula.slidingScale,
  PointsFormula.legacy,
]

/**
 * `PointsFormula(rawValue:) ?? .slidingScale` — canon's read in
 * `MainFeature`, where an unrecognized stored value falls back to the default
 * rather than failing the award.
 */
export const pointsFormulaFromRawValue = (raw: string): PointsFormula =>
  pointsFormulas.find((formula) => formula === raw) ??
  PointsFormula.slidingScale

/**
 * `var label: String`. English literals, exactly as canon spells them.
 *
 * These are the only user-facing strings in this file, and they are canon's
 * own — the `…Exception` copy rule (`RC-8`, derive copy from `kind` in the
 * domain tier) is what makes carrying them here correct rather than a leak.
 */
export const pointsFormulaLabel = (formula: PointsFormula): string =>
  formula === PointsFormula.slidingScale ? 'Sliding scale' : 'Legacy'
