'use client'

/**
 * The Triage form — canon `KroUI/Triage/TriageView.swift`, as one pure Fragment
 * (`RC-15`: it dispatches nothing; every intent arrives as a callback prop).
 *
 * ## It carries no arithmetic, and that is the point
 *
 * KC-IS-#25 moved every rule canon keeps in this view's private structs down
 * into reducers, Shifters and Selectors — the ±5/±10 stepper grain, the
 * duration chip labels, the expiry preset maths, the selected-first ordering,
 * the value↔importance link, the effort×reward ratio, the confirm gate. So the
 * props below are **already decided**: `durationChips` arrive labelled and
 * flagged, `expiryTokens` arrive in their final order, `blockedReason` arrives
 * as the sentence a disabled Complete announces. This file chooses fonts,
 * colours and boxes, and nothing else.
 *
 * The one thing it does compute is where a browser control's value string
 * comes from — `dateTimeInputValue` / `parseDateTimeInput` in
 * `triagePresentation.ts` — which is the control's wire format, not a product
 * rule, and is unit-tested there rather than here.
 *
 * ## Sections, in canon's order
 *
 * Header · Reward points · Duration · Eisenhower matrix · Value · Scheduled
 * date · Expires at · Effort · bottom action row (+ the dark-launched Edit).
 *
 * ## Two deliberate departures from the SwiftUI drawing
 *
 * 1. **The action row is a plain `<button>`, not the design system's `Button`.**
 *    Canon is explicit that these CTAs stay at *full opacity* in both states
 *    and communicate disabled-ness through **tint** (`Color.backInner`) plus a
 *    hand-tuned mid-gray label — *"state communicated via tint, never alpha"*.
 *    The kit's `Button` applies `--kro-opacity-disabled` on `:disabled`, which
 *    is the right default everywhere else and the wrong one here; layering a
 *    tint on top of it would also apply the fade twice, which the token's own
 *    declaration forbids.
 * 2. **The scheduled-date and expiry pickers are `<input type="datetime-local">`,
 *    not a popper.** Canon's `.datePickerStyle(.compact)` is a tap-to-reveal
 *    inline control, and the browser's native one is the closest equivalent the
 *    web has. A Radix popover would be the other candidate and is refused for
 *    the reason this repo has already documented twice
 *    (`design/system/primitives/__tests__/radixEnvironment.tsx`): a
 *    `@radix-ui/react-popper` mount costs 5–12 SECONDS under jsdom, and the
 *    confirm-gating and threshold interaction tests this issue requires have to
 *    be able to drive the form.
 */

import {
  type EisenhowerQuadrant,
  quadrantCaption,
  quadrantDisplayName,
  quadrantIcon,
} from '@kro/core'
import { type ReactNode, useEffect, useRef } from 'react'
import {
  type ColorRole,
  colorVar,
  radiusVar,
} from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import {
  type TriageExpiryPreset,
  type TriageExpiryToken,
  triageExpiryPresetLabel,
} from '../TriageExpiry'
import {
  MAXIMUM_TRIAGE_REWARD_POINTS,
  MINIMUM_TRIAGE_REWARD_POINTS,
  type TriageSecondaryAction,
} from '../TriageRules'
import type { TriageRewardStepDirection } from '../TriageState'
import { type LucideIcon, triageIcon, triageIconFor } from './triageIcons'
import {
  TRIAGE_RATING_STEPS,
  dateTimeInputValue,
  formatTriageMoment,
  isTriageRatingStepLit,
  parseDateTimeInput,
} from './triagePresentation'

const ChevronBackward = triageIcon('chevron.backward')
const StarFill = triageIcon('star.fill')
const StarSlash = triageIcon('star.slash')
const BoltFill = triageIcon('bolt.fill')
const BoltSlash = triageIcon('bolt.slash')
const CheckmarkCircle = triageIcon('checkmark.circle.fill')
const MinusGlyph = triageIcon('minus')
const PlusGlyph = triageIcon('plus')
const CalendarBadgePlus = triageIcon('calendar.badge.plus')
const HourglassGlyph = triageIcon('hourglass')
const PlayFill = triageIcon('play.fill')
const ShareGlyph = triageIcon('square.and.arrow.up')
const ArchiveGlyph = triageIcon('archivebox')

/** `sectionInset: CGFloat = 20`. */
const SECTION_INSET_CLASS = 'px-5'

/** One duration chip, already labelled and flagged by `selectTriageDurationChips`. */
export interface TriageDurationChipModel {
  readonly minutes: number
  readonly label: string
  readonly isSelected: boolean
}

/** One matrix tile, already resolved by `selectTriageQuadrantTiles`. */
export interface TriageQuadrantTileModel {
  readonly quadrant: EisenhowerQuadrant
  readonly isSelected: boolean
  readonly isUrgent: boolean
  readonly isImportant: boolean
}

/** A rating row's two facts, already resolved by its Selector. */
export interface TriageRatingModel {
  readonly rating: number | null
  readonly label: string | null
}

export interface TriageFormFragmentProps {
  readonly endeavorTitle: string
  readonly endeavorSymbol: string
  readonly rewardPoints: number
  readonly durationChips: readonly TriageDurationChipModel[]
  readonly quadrantTiles: readonly TriageQuadrantTileModel[]
  readonly value: TriageRatingModel
  readonly effort: TriageRatingModel
  readonly dueDate: Date | null
  readonly expiry: Date | null
  /** `selectTriageExpiryTokens` — already in selected-first order. */
  readonly expiryTokens: readonly TriageExpiryToken[]
  readonly selectedExpiryToken: TriageExpiryToken | null
  readonly isExpiryCustom: boolean
  readonly canClearExpiry: boolean
  /** `selectTriageExpiryScrollNonce` — bumped when the expiry actually moved. */
  readonly expiryScrollNonce: number
  readonly canConfirm: boolean
  /** The epic's a11y contract: a disabled Complete names what blocks it. */
  readonly blockedReason: string | null
  readonly primaryActionLabel: string
  readonly secondaryAction: TriageSecondaryAction | null
  readonly isEditReachable: boolean
  /** The durable save is in flight, so the action row is not re-entrant. */
  readonly isSaving: boolean
  /** A **local** save failure — the one case the decision was not captured. */
  readonly saveExceptionMessage: string | null
  /** A push that did not land, or a share that fell back. Informational. */
  readonly notice: string | null
  readonly locale?: string

  readonly onTapCancel: () => void
  readonly onSelectQuadrant: (quadrant: EisenhowerQuadrant) => void
  readonly onSelectDuration: (minutes: number) => void
  readonly onSelectDueDate: (date: Date | null) => void
  readonly onSelectExpiry: (date: Date | null) => void
  readonly onTapExpiryPreset: (preset: TriageExpiryPreset) => void
  readonly onStepReward: (direction: TriageRewardStepDirection) => void
  readonly onTapValueRating: (rating: number) => void
  readonly onTapEffortRating: (rating: number) => void
  readonly onTapConfirm: () => void
  readonly onTapStartNow: () => void
  readonly onTapShare: () => void
  readonly onTapArchive: () => void
  readonly onTapEdit: () => void
}

export function TriageFormFragment(props: TriageFormFragmentProps) {
  const {
    endeavorTitle,
    endeavorSymbol,
    rewardPoints,
    durationChips,
    quadrantTiles,
    value,
    effort,
    dueDate,
    expiry,
    expiryTokens,
    selectedExpiryToken,
    isExpiryCustom,
    canClearExpiry,
    expiryScrollNonce,
    canConfirm,
    blockedReason,
    primaryActionLabel,
    secondaryAction,
    isEditReachable,
    isSaving,
    saveExceptionMessage,
    notice,
    locale,
    onTapCancel,
    onSelectQuadrant,
    onSelectDuration,
    onSelectDueDate,
    onSelectExpiry,
    onTapExpiryPreset,
    onStepReward,
    onTapValueRating,
    onTapEffortRating,
    onTapConfirm,
    onTapStartNow,
    onTapShare,
    onTapArchive,
    onTapEdit,
  } = props

  return (
    <div
      data-testid="triage-form"
      className="relative flex h-full min-h-0 w-full flex-col"
    >
      <TriageHeader
        endeavorTitle={endeavorTitle}
        endeavorSymbol={endeavorSymbol}
        rewardPoints={rewardPoints}
        onTapCancel={onTapCancel}
      />

      {/*
        Canon's `ScrollView` with `padding(.bottom, scrollBottomInset)` — the
        action row is anchored over the content, so the last section needs room
        to clear it rather than sitting permanently underneath.
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-40">
        <RewardStepper points={rewardPoints} onStep={onStepReward} />

        <DurationPicker chips={durationChips} onSelect={onSelectDuration} />

        <EisenhowerMatrix tiles={quadrantTiles} onSelect={onSelectQuadrant} />

        <RatingSection
          title="Value to my life / goals"
          emoji="🚀"
          testId="triage-value"
          rating={value}
          onTapRating={onTapValueRating}
        />

        <DueDateSection
          dueDate={dueDate}
          locale={locale}
          onSelect={onSelectDueDate}
        />

        <ExpirySection
          dueDate={dueDate}
          expiry={expiry}
          tokens={expiryTokens}
          selectedToken={selectedExpiryToken}
          isCustom={isExpiryCustom}
          canClear={canClearExpiry}
          scrollNonce={expiryScrollNonce}
          locale={locale}
          onSelectExpiry={onSelectExpiry}
          onTapPreset={onTapExpiryPreset}
        />

        <RatingSection
          title="Effort required"
          emoji="🔥"
          testId="triage-effort"
          rating={effort}
          onTapRating={onTapEffortRating}
        />
      </div>

      <ActionRow
        canConfirm={canConfirm}
        blockedReason={blockedReason}
        primaryActionLabel={primaryActionLabel}
        secondaryAction={secondaryAction}
        isEditReachable={isEditReachable}
        isSaving={isSaving}
        saveExceptionMessage={saveExceptionMessage}
        notice={notice}
        onTapConfirm={onTapConfirm}
        onTapStartNow={onTapStartNow}
        onTapShare={onTapShare}
        onTapArchive={onTapArchive}
        onTapEdit={onTapEdit}
      />
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Header                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Canon's `header` — back chevron, symbol, the "Triage" / title pair, and the
 * always-visible reward badge.
 *
 * The badge is *"bound to the same value the Reward stepper edits, so it
 * updates live"*, and it is `aria-hidden` in favour of one label on the wrapper
 * — canon's `.accessibilityElement(children: .ignore)` — so a screen reader
 * announces "Reward: 30 points" rather than a lone star and a lone number.
 */
function TriageHeader({
  endeavorTitle,
  endeavorSymbol,
  rewardPoints,
  onTapCancel,
}: {
  readonly endeavorTitle: string
  readonly endeavorSymbol: string
  readonly rewardPoints: number
  readonly onTapCancel: () => void
}) {
  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-3 pt-4 pb-3',
        SECTION_INSET_CLASS,
      )}
    >
      <button
        type="button"
        aria-label="Back"
        data-testid="triage-back"
        onClick={onTapCancel}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-kro-field',
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
        )}
        style={{
          width: 'var(--kro-size-min-touch-target)',
          height: 'var(--kro-size-min-touch-target)',
          color: colorVar('fore'),
        }}
      >
        <ChevronBackward size={20} aria-hidden />
      </button>

      <span aria-hidden className="shrink-0 text-[28px] leading-none">
        {endeavorSymbol}
      </span>

      <div className="flex min-w-0 flex-col gap-1">
        <p
          className="m-0 font-semibold text-sm"
          style={{ color: colorVar('foreSecondary') }}
        >
          Triage
        </p>
        <h2
          className="m-0 line-clamp-2 font-semibold text-lg"
          style={{ color: colorVar('fore') }}
        >
          {endeavorTitle}
        </h2>
      </div>

      <span className="flex-1" />

      <div
        data-testid="triage-reward-badge"
        role="img"
        aria-label={`Reward: ${rewardPoints} points`}
        className="flex shrink-0 flex-col items-center gap-0.5"
      >
        <StarFill
          size={18}
          aria-hidden
          style={{ color: colorVar('rewardYellow') }}
        />
        <span
          className="font-bold text-lg tabular-nums"
          style={{ color: colorVar('fore') }}
        >
          {rewardPoints}
        </span>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------------ */
/* Sections                                                                  */
/* ------------------------------------------------------------------------ */

function SectionLabel({ children }: { readonly children: ReactNode }) {
  return (
    <p
      className="m-0 font-semibold text-sm"
      style={{ color: colorVar('foreSecondary') }}
    >
      {children}
    </p>
  )
}

/**
 * Canon's `RewardStepper`.
 *
 * The **grain is not here** — `triageRewardStep` decides ±5 below 50 and ±10
 * at or above it, one tier down, and this only says which control was pressed.
 *
 * The **bounds** are canon's own constants, imported rather than retyped, so a
 * control is genuinely `disabled` at 1 and at 999 exactly as canon's
 * `.disabled(points <= lowerBound)` / `.disabled(points >= upperBound)` are —
 * the same shape `CapturePromptFragment` already uses for its own stepper. A
 * real `disabled` attribute, not only the class: without it the control keeps
 * its click, the `disabled:` utility never applies, and the 1–999 range is a
 * claim the UI never makes.
 */
function RewardStepper({
  points,
  onStep,
}: {
  readonly points: number
  readonly onStep: (direction: TriageRewardStepDirection) => void
}) {
  return (
    <div
      data-testid="triage-reward-stepper"
      className={cn('flex items-center gap-4', SECTION_INSET_CLASS)}
    >
      <SectionLabel>Reward points</SectionLabel>
      <span className="flex-1" />
      <div
        className="flex items-center"
        style={{
          borderRadius: radiusVar('field'),
          backgroundColor: colorVar('backInner'),
          boxShadow: `inset 0 0 0 1px ${colorVar('hairline')}`,
        }}
      >
        <button
          type="button"
          aria-label="Decrease reward points"
          disabled={points <= MINIMUM_TRIAGE_REWARD_POINTS}
          onClick={() => onStep('decrement')}
          className={cn(
            'inline-flex items-center justify-center rounded-kro-field',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
            'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
          )}
          style={{
            width: 'var(--kro-size-min-touch-target)',
            height: 'var(--kro-size-min-touch-target)',
            color: colorVar('fore'),
          }}
        >
          <MinusGlyph size={13} aria-hidden />
        </button>
        <span
          role="img"
          data-testid="triage-reward-value"
          aria-label={`${points} reward points`}
          className="min-w-9 text-center font-semibold text-base tabular-nums"
          style={{ color: colorVar('fore') }}
        >
          {points}
        </span>
        <button
          type="button"
          aria-label="Increase reward points"
          disabled={points >= MAXIMUM_TRIAGE_REWARD_POINTS}
          onClick={() => onStep('increment')}
          className={cn(
            'inline-flex items-center justify-center rounded-kro-field',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
            'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
          )}
          style={{
            width: 'var(--kro-size-min-touch-target)',
            height: 'var(--kro-size-min-touch-target)',
            color: colorVar('fore'),
          }}
        >
          <PlusGlyph size={13} aria-hidden />
        </button>
      </div>
      <StarFill
        size={14}
        aria-hidden
        style={{ color: colorVar('rewardYellow') }}
      />
    </div>
  )
}

/**
 * Canon's `DurationPicker` — edge-to-edge horizontal scroll, and **no Skip
 * chip**.
 *
 * The irreversibility rule lives in `triageDurationSelection`: this row cannot
 * express a revert because it has no control that would send one.
 */
function DurationPicker({
  chips,
  onSelect,
}: {
  readonly chips: readonly TriageDurationChipModel[]
  readonly onSelect: (minutes: number) => void
}) {
  return (
    <section
      className="flex flex-col gap-2"
      aria-label="How long will it take?"
    >
      <div className={SECTION_INSET_CLASS}>
        <SectionLabel>How long will it take?</SectionLabel>
      </div>
      <div
        data-testid="triage-duration-chips"
        role="group"
        aria-label="Duration"
        className={cn('flex gap-2 overflow-x-auto', SECTION_INSET_CLASS)}
      >
        {chips.map((chip) => (
          <SelectionPill
            key={chip.minutes}
            label={chip.label}
            isSelected={chip.isSelected}
            onSelect={() => onSelect(chip.minutes)}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * The shared pill — canon's `chipButton`, used by the duration chips, the
 * expiry presets and the two "Add a …" CTAs.
 *
 * *"Unselected pills render without an outline in light mode … dark mode keeps
 * a subtle stroke"*. That split is a token concern rather than a branch here:
 * `--kro-color-hairline` already resolves per scheme, so the ring is drawn
 * unconditionally and the palette decides how loud it is.
 */
function SelectionPill({
  label,
  isSelected,
  glyph,
  onSelect,
  testId,
}: {
  readonly label: string
  readonly isSelected: boolean
  readonly glyph?: ReactNode
  readonly onSelect: () => void
  readonly testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-kro-pill px-3.5',
        'font-semibold text-sm',
        'kro-motion-quick transition-[background-color,color]',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        minHeight: 'var(--kro-size-min-touch-target)',
        backgroundColor: isSelected
          ? colorVar('accent')
          : colorVar('backInner'),
        color: isSelected ? colorVar('onAccent') : colorVar('fore'),
        boxShadow: isSelected
          ? undefined
          : `inset 0 0 0 1px ${colorVar('hairline')}`,
      }}
    >
      {glyph}
      {label}
    </button>
  )
}

/**
 * Canon's `EisenhowerMatrix` — the 2 × 2 grid with an axis label on each side.
 *
 * The tiles arrive in `eisenhowerQuadrants` order (Prioritize, Schedule,
 * Delegate, Archive), which is exactly the reading order of canon's two
 * `GridRow`s, so the grid is laid out by index and never re-sorted here.
 *
 * The row labels are rotated, as canon rotates them. They are `aria-hidden`
 * because each tile already announces its own axes in words — a rotated
 * decorative label read twice is noise, not information.
 */
function EisenhowerMatrix({
  tiles,
  onSelect,
}: {
  readonly tiles: readonly TriageQuadrantTileModel[]
  readonly onSelect: (quadrant: EisenhowerQuadrant) => void
}) {
  return (
    <section
      className={cn('flex flex-col gap-2', SECTION_INSET_CLASS)}
      aria-label="Where does it belong?"
    >
      <SectionLabel>Where does it belong?</SectionLabel>

      {/*
        The leading spacer is a real 22px column plus the row's own gap, not a
        `pl-[22px]`: the tile rows are `label | gap | grid`, so padding alone
        drops one gap and every column header lands ~12px left of the column it
        names.
      */}
      <div aria-hidden className="flex gap-3">
        <span className="w-[22px] shrink-0" />
        <ColumnLabel>Urgent</ColumnLabel>
        <ColumnLabel>Not urgent</ColumnLabel>
      </div>

      <div
        role="group"
        aria-label="Eisenhower matrix"
        data-testid="triage-matrix"
        className="flex flex-col gap-3"
      >
        <div className="flex items-stretch gap-3">
          <RowLabel>Important</RowLabel>
          <div className="grid flex-1 grid-cols-2 gap-3">
            {tiles.slice(0, 2).map((tile) => (
              <QuadrantTile
                key={tile.quadrant}
                tile={tile}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
        <div className="flex items-stretch gap-3">
          <RowLabel>Not important</RowLabel>
          <div className="grid flex-1 grid-cols-2 gap-3">
            {tiles.slice(2, 4).map((tile) => (
              <QuadrantTile
                key={tile.quadrant}
                tile={tile}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ColumnLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span
      className="flex-1 text-center font-bold text-[11px] uppercase tracking-wide"
      style={{ color: colorVar('foreSecondary') }}
    >
      {children}
    </span>
  )
}

/**
 * Canon's rotated row label — `.fixedSize().rotationEffect(.degrees(-90))` over
 * a fixed 22-point column.
 *
 * **`.fixedSize()` is the load-bearing half**, and it is why this is a rotated
 * horizontal line rather than `writing-mode: vertical-rl`. In a vertical
 * writing mode the *inline* axis is vertical, so the text is laid out against
 * the column's HEIGHT — and the moment a row is shorter than the label is long
 * the label loses a letter. "NOT IMPORTANT" is the longer of the two and the
 * desktop popover's rows are the shorter, so that one pairing clipped to "OT
 * IMPORTANT". A horizontal line at `width: max-content`, rotated a quarter
 * turn and centred absolutely, has no such coupling: its box never depends on
 * the column, exactly as canon's does not.
 *
 * `aria-hidden` because every tile already announces its own axes in words; a
 * decorative label read twice is noise, not information.
 */
function RowLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span aria-hidden className="relative w-[22px] shrink-0">
      <span
        className="absolute top-1/2 left-1/2 whitespace-nowrap font-bold text-[10px] uppercase tracking-wide"
        style={{
          color: colorVar('foreSecondary'),
          width: 'max-content',
          transformOrigin: 'center',
          transform: 'translate(-50%, -50%) rotate(-90deg)',
        }}
      >
        {children}
      </span>
    </span>
  )
}

/** The four tints canon assigns the quadrants. */
const QUADRANT_TINT: Record<EisenhowerQuadrant, ColorRole> = {
  prioritize: 'badgeRed',
  decide: 'badgeBlue',
  delegate: 'badgeOrange',
  delete: 'badgeNeutral',
}

/**
 * One tile.
 *
 * Unselected: the two axis rows, centred, positives semibold and the negations
 * regular — *"so they read as a softer denial"*. Selected: the resolution name,
 * its caption, the quadrant glyph and a checkmark badge, top-leading, over the
 * tinted translucent fill that is *"the only place tinted translucency lives on
 * the screen"*.
 */
function QuadrantTile({
  tile,
  onSelect,
}: {
  readonly tile: TriageQuadrantTileModel
  readonly onSelect: (quadrant: EisenhowerQuadrant) => void
}) {
  const { quadrant, isSelected, isUrgent, isImportant } = tile
  const tint = colorVar(QUADRANT_TINT[quadrant])
  const icon = quadrantIcon(quadrant)
  const Glyph = triageIconFor(icon.type === 'glyph' ? icon.name : '')
  const name = quadrantDisplayName(quadrant)
  const caption = quadrantCaption(quadrant)

  return (
    <button
      type="button"
      data-testid={`triage-quadrant-${quadrant}`}
      aria-pressed={isSelected}
      aria-label={`${name} — ${caption}`}
      onClick={() => onSelect(quadrant)}
      className={cn(
        'flex min-h-[110px] w-full flex-col gap-1.5 p-3.5 text-left',
        'kro-motion-quick transition-[background-color,box-shadow]',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
        isSelected
          ? 'items-start justify-start'
          : 'items-center justify-center',
        /*
          Canon's two-branch unselected fill: *"explicit sRGB white in light
          mode (clean card on the form surface); the palette's elevated dark
          gray in dark mode (slightly lighter than the surrounding glass surface
          so the tile still stands out)"*.

          No single token expresses that — `--kro-color-absolute` is white in
          light and BLACK in dark, which inverts canon's intent and makes the
          tile disappear into the panel. `globals.css` mints the `dark:` variant
          for exactly this case ("the rare utility that has to differ beyond
          what a token can express"), so the pair is two classes rather than a
          `matchMedia` read in the render body.

          Classes, not an inline style, because an inline `backgroundColor`
          would outrank both.
        */
        !isSelected && 'bg-kro-absolute dark:bg-kro-back-inner',
      )}
      style={{
        borderRadius: radiusVar('card'),
        ...(isSelected
          ? { backgroundColor: `color-mix(in srgb, ${tint} 18%, transparent)` }
          : {}),
        boxShadow: isSelected
          ? `inset 0 0 0 2px ${tint}`
          : `inset 0 0 0 1px ${colorVar('hairline')}, var(--kro-shadow-subtle)`,
        color: isSelected ? tint : colorVar('foreSecondary'),
      }}
    >
      {isSelected ? (
        <>
          <span className="flex w-full items-center">
            <Glyph size={18} aria-hidden />
            <span className="flex-1" />
            <CheckmarkCircle size={15} aria-hidden />
          </span>
          <span className="font-semibold text-base">{name}</span>
          <span
            className="text-xs"
            style={{ color: colorVar('foreSecondary') }}
          >
            {caption}
          </span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-1">
            {isUrgent ? (
              <BoltFill size={12} aria-hidden />
            ) : (
              <BoltSlash size={12} aria-hidden />
            )}
            <span
              className={cn(
                'text-sm',
                isUrgent ? 'font-semibold' : 'font-normal',
              )}
            >
              {isUrgent ? 'Urgent' : 'Not urgent'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            {isImportant ? (
              <StarFill size={12} aria-hidden />
            ) : (
              <StarSlash size={12} aria-hidden />
            )}
            <span
              className={cn(
                'text-sm',
                isImportant ? 'font-semibold' : 'font-normal',
              )}
            >
              {isImportant ? 'Important' : 'Not important'}
            </span>
          </span>
        </>
      )}
    </button>
  )
}

/**
 * Canon's `RatingRow`, wrapped in its section — the same shape for Value
 * (rockets, Trivial…Life-changing) and Effort (fires, Autopilot…Grueling).
 *
 * The descriptor comes in as a prop because the *labels* are canon's and live
 * in `TriageRules`; tapping the current rating clears it, and that rule is
 * `triageRatingSelection`'s. Both are read here, neither is decided here.
 */
function RatingSection({
  title,
  emoji,
  testId,
  rating,
  onTapRating,
}: {
  readonly title: string
  readonly emoji: string
  readonly testId: string
  readonly rating: TriageRatingModel
  readonly onTapRating: (rating: number) => void
}) {
  return (
    <section
      className={cn('flex flex-col gap-2', SECTION_INSET_CLASS)}
      aria-label={title}
      data-testid={testId}
    >
      <SectionLabel>{title}</SectionLabel>
      <div className="flex items-center gap-2">
        {rating.label === null ? null : (
          <span
            data-testid={`${testId}-label`}
            // Announced by the buttons' own labels; a second reading of the
            // same word is canon's `.accessibilityHidden(true)`.
            aria-hidden
            className="font-semibold text-sm"
            style={{ color: colorVar('fore') }}
          >
            {rating.label}
          </span>
        )}
        <span className="flex-1" />
        <div
          className="flex items-center gap-0.5"
          role="group"
          aria-label={title}
        >
          {TRIAGE_RATING_STEPS.map((step) => {
            const isLit = isTriageRatingStepLit(rating.rating, step)
            return (
              <button
                key={step}
                type="button"
                aria-pressed={rating.rating === step}
                aria-label={`${title}, level ${step}`}
                data-testid={`${testId}-step-${step}`}
                onClick={() => onTapRating(step)}
                className={cn(
                  'inline-flex size-9 items-center justify-center rounded-kro-small',
                  'kro-motion-quick transition-[opacity,transform] text-[22px] leading-none',
                  'outline-none focus-visible:shadow-[var(--kro-ring)]',
                )}
                style={{
                  opacity: isLit ? 1 : 0.25,
                  transform: rating.rating === step ? 'scale(1.12)' : undefined,
                }}
              >
                <span aria-hidden>{emoji}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** Canon's `DueDateSection` — the compact picker, or the CTA that reveals it. */
function DueDateSection({
  dueDate,
  locale,
  onSelect,
}: {
  readonly dueDate: Date | null
  readonly locale?: string
  readonly onSelect: (date: Date | null) => void
}) {
  return (
    <section
      className={cn('flex flex-col gap-2', SECTION_INSET_CLASS)}
      aria-label="Scheduled date"
      data-testid="triage-due-date"
    >
      <div className="flex items-center">
        <SectionLabel>Scheduled date</SectionLabel>
        <span className="flex-1" />
        {dueDate === null ? null : (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="font-semibold text-xs outline-none focus-visible:shadow-[var(--kro-ring)]"
            style={{ color: colorVar('accent') }}
          >
            Clear
          </button>
        )}
      </div>

      {dueDate === null ? (
        <div>
          <SelectionPill
            testId="triage-add-due-date"
            label="Add a scheduled date"
            isSelected={false}
            glyph={<CalendarBadgePlus size={14} aria-hidden />}
            /*
              Canon seeds `Date()` here and lets the reducer take it from there.
              The same instant is read at the moment of the tap, never at render
              time, so the value is "now" in the user's sense of the word.
            */
            onSelect={() => onSelect(new Date())}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <input
            type="datetime-local"
            aria-label="Scheduled date"
            data-testid="triage-due-date-input"
            className={cn(
              'w-full bg-transparent px-3 text-base outline-none',
              'focus-visible:shadow-[var(--kro-ring)]',
            )}
            style={{
              minHeight: 'var(--kro-size-field-min-height)',
              borderRadius: radiusVar('field'),
              backgroundColor: colorVar('backInner'),
              color: colorVar('fore'),
            }}
            value={dateTimeInputValue(dueDate)}
            onChange={(event) => {
              const parsed = parseDateTimeInput(event.target.value)
              if (parsed !== null) onSelect(parsed)
            }}
          />
          <p
            className="m-0 text-xs"
            style={{ color: colorVar('foreSecondary') }}
          >
            {formatTriageMoment(dueDate, locale)}
          </p>
        </div>
      )}
    </section>
  )
}

/**
 * Canon's `ExpirySection` + `ExpiryPillRow`.
 *
 * With a scheduled date it is one horizontally scrolling row: the always-on
 * compact picker at the leading edge, then the preset pills **in the order the
 * Selector already put them** (selected first) and the informational Custom
 * indicator. Without one it falls back to a plain picker or the "Add an expiry"
 * CTA, because there is no anchor to compute a preset against.
 *
 * The scroll reset is canon's `proxy.scrollTo(leadingAnchorID)`, driven by the
 * slice's `expiryScrollNonce` rather than by this file comparing dates: a view
 * cannot tell "the expiry changed" from a value it only ever sees the latest
 * of, and re-picking the already-selected pill must **not** scroll.
 */
function ExpirySection({
  dueDate,
  expiry,
  tokens,
  selectedToken,
  isCustom,
  canClear,
  scrollNonce,
  locale,
  onSelectExpiry,
  onTapPreset,
}: {
  readonly dueDate: Date | null
  readonly expiry: Date | null
  readonly tokens: readonly TriageExpiryToken[]
  readonly selectedToken: TriageExpiryToken | null
  readonly isCustom: boolean
  readonly canClear: boolean
  readonly scrollNonce: number
  readonly locale?: string
  readonly onSelectExpiry: (date: Date | null) => void
  readonly onTapPreset: (preset: TriageExpiryPreset) => void
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    rowRef.current?.scrollTo?.({ left: 0, behavior: 'smooth' })
  }, [scrollNonce])

  const isPresetSelected = (preset: TriageExpiryPreset) =>
    selectedToken !== null &&
    selectedToken.kind === 'preset' &&
    selectedToken.preset === preset

  return (
    <section
      className="flex flex-col gap-2"
      aria-label="Expires at"
      data-testid="triage-expiry"
    >
      <div className={cn('flex items-center', SECTION_INSET_CLASS)}>
        <SectionLabel>Expires at</SectionLabel>
        <span className="flex-1" />
        {canClear ? (
          <button
            type="button"
            onClick={() => onSelectExpiry(null)}
            className="font-semibold text-xs outline-none focus-visible:shadow-[var(--kro-ring)]"
            style={{ color: colorVar('accent') }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {dueDate === null ? (
        expiry === null ? (
          <div className={SECTION_INSET_CLASS}>
            <SelectionPill
              testId="triage-add-expiry"
              label="Add an expiry"
              isSelected={false}
              glyph={<HourglassGlyph size={14} aria-hidden />}
              onSelect={() => onSelectExpiry(new Date())}
            />
          </div>
        ) : (
          <div className={SECTION_INSET_CLASS}>
            <ExpiryInput
              value={expiry}
              locale={locale}
              onSelect={onSelectExpiry}
            />
          </div>
        )
      ) : (
        <div
          ref={rowRef}
          data-testid="triage-expiry-row"
          className={cn(
            'flex items-center gap-2 overflow-x-auto',
            SECTION_INSET_CLASS,
          )}
        >
          <ExpiryInput
            value={expiry ?? dueDate}
            locale={locale}
            compact
            onSelect={onSelectExpiry}
          />
          {tokens.map((token) =>
            token.kind === 'preset' ? (
              <SelectionPill
                key={`preset-${token.preset}`}
                label={triageExpiryPresetLabel(token.preset)}
                isSelected={isPresetSelected(token.preset)}
                onSelect={() => onTapPreset(token.preset)}
              />
            ) : (
              /*
                Canon's `customIndicatorPill` — *"an indicator only … it does
                NOT toggle the picker"*. So it is rendered as a `<span>`, not a
                disabled button: a control that announces itself and then
                refuses every interaction is worse than not claiming to be one.
              */
              <span
                key="custom"
                role="img"
                data-testid="triage-expiry-custom"
                aria-label={isCustom ? 'Custom date selected' : 'Custom date'}
                className={cn(
                  'inline-flex shrink-0 items-center rounded-kro-pill px-3.5',
                  'font-semibold text-sm',
                )}
                style={{
                  minHeight: 'var(--kro-size-min-touch-target)',
                  lineHeight: 'var(--kro-size-min-touch-target)',
                  backgroundColor: isCustom
                    ? colorVar('accent')
                    : colorVar('backInner'),
                  color: isCustom ? colorVar('onAccent') : colorVar('fore'),
                  boxShadow: isCustom
                    ? undefined
                    : `inset 0 0 0 1px ${colorVar('hairline')}`,
                }}
              >
                Custom
              </span>
            ),
          )}
        </div>
      )}
    </section>
  )
}

function ExpiryInput({
  value,
  locale,
  compact = false,
  onSelect,
}: {
  readonly value: Date
  readonly locale?: string
  readonly compact?: boolean
  readonly onSelect: (date: Date | null) => void
}) {
  return (
    <input
      type="datetime-local"
      aria-label="Expires at"
      data-testid="triage-expiry-input"
      lang={locale}
      className={cn(
        'bg-transparent px-3 text-base outline-none',
        'focus-visible:shadow-[var(--kro-ring)]',
        compact ? 'shrink-0' : 'w-full',
      )}
      style={{
        minHeight: 'var(--kro-size-min-touch-target)',
        borderRadius: radiusVar('field'),
        backgroundColor: colorVar('backInner'),
        color: colorVar('fore'),
      }}
      value={dateTimeInputValue(value)}
      onChange={(event) => {
        const parsed = parseDateTimeInput(event.target.value)
        if (parsed !== null) onSelect(parsed)
      }}
    />
  )
}

/* ------------------------------------------------------------------------ */
/* The bottom action row                                                     */
/* ------------------------------------------------------------------------ */

/** The secondary button's tint, label and glyph — canon's `TriageSecondaryAction`. */
const SECONDARY_ACTION: Record<
  TriageSecondaryAction,
  {
    readonly label: string
    readonly tint: ColorRole
    readonly Glyph: LucideIcon
  }
> = {
  startNow: { label: 'Start Now', tint: 'badgeGreen', Glyph: PlayFill },
  share: { label: 'Share', tint: 'badgeOrange', Glyph: ShareGlyph },
  archive: { label: 'Archive', tint: 'badgeNeutral', Glyph: ArchiveGlyph },
}

/**
 * Canon's bottom-anchored `actionRow`, plus the dark-launched `editButton`.
 *
 * *"Form content scrolls behind it"* — so it is absolutely positioned over the
 * scroller with no plate of its own, and the scroller reserves the inset. The
 * blocked reason sits above the buttons rather than inside them: a disabled
 * control leaves the a11y action surface, so the sentence has to be reachable
 * as text and referenced by `aria-describedby`.
 */
function ActionRow({
  canConfirm,
  blockedReason,
  primaryActionLabel,
  secondaryAction,
  isEditReachable,
  isSaving,
  saveExceptionMessage,
  notice,
  onTapConfirm,
  onTapStartNow,
  onTapShare,
  onTapArchive,
  onTapEdit,
}: Pick<
  TriageFormFragmentProps,
  | 'canConfirm'
  | 'blockedReason'
  | 'primaryActionLabel'
  | 'secondaryAction'
  | 'isEditReachable'
  | 'isSaving'
  | 'saveExceptionMessage'
  | 'notice'
  | 'onTapConfirm'
  | 'onTapStartNow'
  | 'onTapShare'
  | 'onTapArchive'
  | 'onTapEdit'
>) {
  const secondary =
    secondaryAction === null ? null : SECONDARY_ACTION[secondaryAction]

  const onTapSecondary = () => {
    if (secondaryAction === 'startNow') onTapStartNow()
    else if (secondaryAction === 'share') onTapShare()
    else if (secondaryAction === 'archive') onTapArchive()
  }

  return (
    <div
      data-testid="triage-action-row"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 pb-3.5',
        SECTION_INSET_CLASS,
      )}
    >
      {/*
        Always mounted, so a screen reader announces the reason CHANGING
        (no quadrant -> no date) rather than only its arrival. Same shape the
        capture prompt uses for its own blocked Add.
      */}
      <p
        id="triage-blocked-reason"
        data-testid="triage-blocked-reason"
        aria-live="polite"
        className={cn(
          'pointer-events-auto m-0 rounded-kro-small px-2 py-1 text-sm',
          blockedReason === null && 'sr-only',
        )}
        style={
          blockedReason === null
            ? undefined
            : {
                color: colorVar('fore'),
                backgroundColor: colorVar('backInner'),
              }
        }
      >
        {blockedReason ?? ''}
      </p>

      {saveExceptionMessage === null ? null : (
        <p
          data-testid="triage-save-error"
          role="alert"
          className="pointer-events-auto m-0 rounded-kro-small px-2 py-1 text-sm"
          style={{
            color: 'white',
            backgroundColor: colorVar('bannerDanger'),
          }}
        >
          {saveExceptionMessage}
        </p>
      )}

      {notice === null ? null : (
        <p
          data-testid="triage-notice"
          aria-live="polite"
          className="pointer-events-auto m-0 rounded-kro-small px-2 py-1 text-sm"
          style={{
            color: colorVar('fore'),
            backgroundColor: colorVar('backInner'),
          }}
        >
          {notice}
        </p>
      )}

      <div className="pointer-events-auto flex items-center gap-3">
        <TriageActionButton
          label={primaryActionLabel}
          tint="badgeBlue"
          testId="triage-confirm"
          isEnabled={canConfirm && !isSaving}
          describedBy={
            blockedReason === null ? undefined : 'triage-blocked-reason'
          }
          onSelect={onTapConfirm}
        />
        {secondary === null ? null : (
          <TriageActionButton
            label={secondary.label}
            tint={secondary.tint}
            testId={`triage-secondary-${secondaryAction}`}
            glyph={<secondary.Glyph size={15} aria-hidden />}
            isEnabled={canConfirm && !isSaving}
            describedBy={
              blockedReason === null ? undefined : 'triage-blocked-reason'
            }
            onSelect={onTapSecondary}
          />
        )}
      </div>

      {isEditReachable ? (
        <button
          type="button"
          data-testid="triage-edit"
          aria-label="Edit endeavor"
          onClick={onTapEdit}
          className={cn(
            'pointer-events-auto inline-flex w-full items-center justify-center rounded-kro-field',
            'font-semibold text-sm outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            minHeight: 'var(--kro-size-min-touch-target)',
            backgroundColor: colorVar('backInner'),
            color: colorVar('fore'),
          }}
        >
          Edit
        </button>
      ) : null}
    </div>
  )
}

/**
 * Canon's `TriageActionButton`.
 *
 * Two constraints drive the shape, and both are canon's own words:
 *   1. *"Stays at full opacity regardless of state"* — the disabled look is a
 *      **tint** change (`Color.backInner`) plus a dimmer label, never an alpha
 *      fade. That is why this is not the kit's `Button`, whose `:disabled`
 *      correctly applies `--kro-opacity-disabled` for every other control.
 *   2. Taps are gated rather than the control being removed from the tree —
 *      canon's `allowsHitTesting(isEnabled)`. Here that is a real `disabled`
 *      attribute, because the web has one and it is what carries the state into
 *      the accessibility tree; the label then names the state too, matching
 *      canon's `"\(label), unavailable"`.
 */
function TriageActionButton({
  label,
  tint,
  testId,
  glyph,
  isEnabled,
  describedBy,
  onSelect,
}: {
  readonly label: string
  readonly tint: ColorRole
  readonly testId: string
  readonly glyph?: ReactNode
  readonly isEnabled: boolean
  readonly describedBy?: string
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={!isEnabled}
      aria-label={isEnabled ? label : `${label}, unavailable`}
      aria-describedby={isEnabled ? undefined : describedBy}
      onClick={onSelect}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-kro-field',
        'font-semibold text-base',
        'kro-motion-quick transition-[background-color,color]',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        minHeight: 'var(--kro-size-min-touch-target)',
        backgroundColor: isEnabled ? colorVar(tint) : colorVar('backInner'),
        color: isEnabled ? 'white' : colorVar('foreSecondary'),
      }}
    >
      {glyph}
      {label}
    </button>
  )
}
