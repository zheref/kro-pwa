/**
 * `Endeavor.RepeatConfig` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * A recurrence rule: one of four **bases** plus an `everyOther` multiplier
 * ("every 2nd week"). Canon's `Base` is an enum with associated values and a
 * hand-written `Codable`; this port is the discriminated union (`RC-24`) whose
 * members are *exactly* that encoded shape, which is what makes
 * `RepeatConfigCodec` almost the identity function and keeps the JSON
 * byte-compatible with KroApple and KroAndroid.
 *
 * `everyOther` defaults to `1` — canon's `public var everyOther: Int = 1` and
 * the `= 1` default on its initializer both say so, and `1` means "every
 * one", i.e. no skipping.
 */
import type { Month } from '../shared/Month'
import type { WeekDay } from '../shared/WeekDay'

/** The four recurrence bases, discriminated exactly as canon encodes them. */
export type RepeatBase =
  | { readonly type: 'daily' }
  | { readonly type: 'weekly'; readonly weekdays: readonly WeekDay[] }
  | { readonly type: 'monthly'; readonly day: number }
  | { readonly type: 'yearly'; readonly day: number; readonly month: Month }

/** The discriminants, matching canon's `Base.BaseType` raw values. */
export const RepeatBaseType = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
} as const

export type RepeatBaseType =
  (typeof RepeatBaseType)[keyof typeof RepeatBaseType]

/** `BaseType.allCases`, in canon declaration order. */
export const repeatBaseTypes: readonly RepeatBaseType[] = [
  RepeatBaseType.daily,
  RepeatBaseType.weekly,
  RepeatBaseType.monthly,
  RepeatBaseType.yearly,
]

/** `.daily`. */
export const dailyBase = (): RepeatBase => ({ type: 'daily' })

/** `.weekly(weekdays:)`. */
export const weeklyBase = (weekdays: readonly WeekDay[]): RepeatBase => ({
  type: 'weekly',
  weekdays,
})

/** `.monthly(day:)` — the day-of-month the rule fires on. */
export const monthlyBase = (day: number): RepeatBase => ({
  type: 'monthly',
  day,
})

/** `.yearly(day:month:)`. */
export const yearlyBase = (day: number, month: Month): RepeatBase => ({
  type: 'yearly',
  day,
  month,
})

export interface RepeatConfig {
  readonly base: RepeatBase
  /** "Every Nth" multiplier. `1` (canon's default) means every occurrence. */
  readonly everyOther: number
}

/** `RepeatConfig(base:everyOther:)`, with canon's `everyOther` default of 1. */
export const makeRepeatConfig = (
  base: RepeatBase,
  everyOther = 1,
): RepeatConfig => ({ base, everyOther })
