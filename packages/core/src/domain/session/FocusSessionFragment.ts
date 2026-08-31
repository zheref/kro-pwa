/**
 * `SessionFragment` — canon `KroCore/Model/Session/Index.swift`.
 *
 * One continuous focus period: a `start`, and an `end` that stays `null` while
 * the period is still open. The **sum of fragment spans is the elapsed time**
 * of a running session — there is no tick counter anywhere in this tier
 * (`docs/Features/Session.md`, "Anchored time accounting").
 *
 * **Renamed to `FocusSessionFragment`.** Two other `SessionFragment`s already
 * exist in this package: `domain/endeavor`'s `PerformFragment` (canon's
 * *nested* `Perform.SessionFragment`, renamed by #7, with
 * `startedAt`/`endedAt`) and the legacy `/session` timer's `SessionFragment`
 * (`model/Session/SessionFragment.ts`, with `end: Date | undefined` and
 * **millisecond** spans), which the barrel still exports. Same rule as #7:
 * disambiguate the incoming name rather than shadow an existing export.
 *
 * The two live fragment types are genuinely different and both are needed —
 * this one is the running-session anchor, `PerformFragment` is what a recorded
 * `Perform` stores — so `toPerformFragment` below is the one sanctioned
 * conversion between them.
 */
import type { PerformFragment } from '../endeavor/Perform'
import { makePerformFragment } from '../endeavor/Perform'
import {
  type TimeIntervalSeconds,
  secondsBetween,
} from '../shared/TimeInterval'

/** Canon's `SessionFragment`. `end` is `null` while the fragment is open. */
export interface FocusSessionFragment {
  readonly start: Date
  readonly end: Date | null
}

export const makeFocusSessionFragment = (params: {
  readonly start: Date
  readonly end?: Date | null
}): FocusSessionFragment => ({
  start: params.start,
  end: params.end ?? null,
})

/** `isCompleted` — an `end` timestamp exists. */
export const isFocusSessionFragmentCompleted = (
  fragment: FocusSessionFragment,
): boolean => fragment.end !== null

/**
 * `duration(now:)` — the span of a closed fragment, or the seconds elapsed so
 * far for an open one.
 *
 * Note the deliberate contrast with `performFragmentDuration`, which returns
 * `null` for an open fragment: canon's two types answer this question
 * differently, and both answers are correct for their owner. A *running*
 * session must measure its open fragment against `now` — that is the whole
 * anchoring mechanism — while a *recorded* performance has no live clock to
 * measure against.
 *
 * `now` is a parameter, never an ambient read: this tier compiles with
 * `types: []` and has no sanctioned clock (the precedent #7 set in
 * `EndeavorComputed`).
 */
export const focusSessionFragmentDuration = (
  fragment: FocusSessionFragment,
  now: Date,
): TimeIntervalSeconds => secondsBetween(fragment.start, fragment.end ?? now)

/** Closes an open fragment at `endedAt`. A closed fragment is returned as-is. */
export const closeFocusSessionFragment = (
  fragment: FocusSessionFragment,
  endedAt: Date,
): FocusSessionFragment =>
  fragment.end === null ? { start: fragment.start, end: endedAt } : fragment

/**
 * The `KroCore.SessionFragment` → `Endeavor.Perform.SessionFragment` mapping
 * canon performs in `MainProducer.produceRecordPerformanceEffect` before
 * handing fragments to the performance record.
 */
export const toPerformFragment = (
  fragment: FocusSessionFragment,
): PerformFragment =>
  makePerformFragment({ startedAt: fragment.start, endedAt: fragment.end })
