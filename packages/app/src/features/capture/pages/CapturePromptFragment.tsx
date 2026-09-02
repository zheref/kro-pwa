'use client'

/**
 * The capture prompt — canon `Kro/Components/EndeavorInputPrompt.swift`'s
 * `mainForm`, as one pure Fragment (`RC-15`: it dispatches nothing; every
 * intent arrives as a callback prop).
 *
 * ## The panel, and the two idioms
 *
 * Canon presents the same form two ways: `bottomAnchoredSheet` on the phone —
 * a sheet whose detent IS its content's measured height — and a plain `.sheet`
 * on the Mac. KC-IS-#24 fixes the web pair as *bottom sheet with a custom
 * detent / desktop glass popover*, so:
 *
 *   · **sheet** is the design system's `SheetContent side="bottom"`, whose
 *     height is its content up to `85vh`. That IS the custom detent: nothing
 *     here asks for a fraction of the viewport, so the panel is exactly as tall
 *     as the form — the property canon's `reportedHeight` measurement exists to
 *     produce.
 *   · **popover** is a glass panel anchored to the bottom-trailing corner — the
 *     corner the quick-action FAB occupies — at `CAPTURE_PROMPT_POPOVER_WIDTH`.
 *
 * Both are the same Radix dialog root, which is what the design system's
 * `Sheet`/`Dialog` split exists for: one focus trap, one scroll lock, one
 * escape key, two presentations.
 *
 * **Dismissal is Discard.** Canon passes `dismissDisabled: true` and closes the
 * sheet only through Discard or Add, because the draft is dropped whole either
 * way (`withPromptClosed`). On the web an un-escapable dialog is hostile, so
 * Escape and the overlay both route to `onDiscard` — the same outcome canon's
 * two buttons produce, reached through the platform's own affordances.
 *
 * ## What is local state here, and why that is not an `RC-4` breach
 *
 * Exactly one thing: which inline panel is expanded (`date` / `rewards` /
 * `repeat` / `destination`). The capture slice's own header states the split —
 * the time pickers' snapshots are logic and live in the slice, while *"the
 * 'is the picker showing' booleans stay with #24"*. So the two time panels are
 * **derived** from the slice (`prompt.startEdit !== null`) and are not held
 * here at all; only the disclosures canon keeps in `@State` with no logic
 * behind them are local, and they close on a kind change exactly as canon's
 * `onChange(of: draft.selectedKind)` does.
 */

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../design/system/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../design/system/primitives/dialog'
import { Input } from '../../../design/system/primitives/input'
import { SheetContent } from '../../../design/system/primitives/sheet'
import { colorVar, radiusVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type {
  CaptureTimeEditOutcome,
  CaptureTimeField,
} from '../CaptureFeature'
import {
  type CaptureDestination,
  type CaptureDraft,
  CaptureKind,
  type CaptureRecurrence,
  MAXIMUM_CAPTURE_REWARDS,
  MINIMUM_CAPTURE_REWARDS,
  captureDestinationGlyph,
  captureDestinationLabel,
  captureKindGlyph,
  captureKindLabel,
  captureKindPlaceholder,
  captureKinds,
} from '../CaptureRules'
import { captureIcon, captureIconFor } from './captureIcons'
import {
  CAPTURE_PROMPT_POPOVER_WIDTH,
  type CapturePresentationKind,
  captureRecurrencePresets,
  captureRepeatChipLabel,
  dateInputValue,
  formatCaptureDate,
  formatCaptureTime,
  parseDateInput,
  parseTimeInput,
  timeInputValue,
} from './capturePresentation'

const Star = captureIcon('star.fill')
const CalendarGlyph = captureIcon('calendar')
const ClockGlyph = captureIcon('clock')
const ClockEndGlyph = captureIcon('clock.badge.checkmark')
const ClearGlyph = captureIcon('xmark.circle.fill')
const RepeatGlyph = captureIcon('repeat')
const ChevronDown = captureIcon('chevron.down')
const Check = captureIcon('checkmark')

/** Canon's stepper step: 5 below 50 points, 10 at or above it. */
export const captureRewardStep = (points: number): number =>
  points >= 50 ? 10 : 5

const promptControlMinHeight = (isCompact: boolean): string =>
  isCompact
    ? 'var(--kro-size-min-pointer-target)'
    : 'var(--kro-size-min-touch-target)'

/** Which inline panel is expanded. Only one at a time, exactly as canon. */
type PromptPanel = 'date' | 'rewards' | 'repeat' | 'destination' | null

export interface CapturePromptFragmentProps {
  readonly isOpen: boolean
  readonly draft: CaptureDraft
  /** `prompt.startEdit !== null` — the slice owns the snapshot, not this view. */
  readonly isEditingStartTime: boolean
  readonly isEditingEndTime: boolean
  readonly availableDestinations: readonly CaptureDestination[]
  readonly canSubmit: boolean
  /** The epic's a11y contract: a disabled Add names what blocks it. */
  readonly blockedReason: string | null
  readonly presentation: CapturePresentationKind
  /** Explicit, never a clock read — "Today" must not depend on the wall clock. */
  readonly now: Date
  readonly locale?: string

  readonly onEditTitle: (title: string) => void
  readonly onSelectKind: (kind: CaptureKind) => void
  readonly onPickDate: (date: Date) => void
  /** The date chip's Clear button — never offered for an Event (`KC-IS-#75`). */
  readonly onClearDate: () => void
  readonly onBeginTimeEdit: (field: CaptureTimeField) => void
  readonly onPickTime: (field: CaptureTimeField, time: Date) => void
  readonly onEndTimeEdit: (
    field: CaptureTimeField,
    outcome: CaptureTimeEditOutcome,
  ) => void
  readonly onPickRewards: (points: number) => void
  readonly onPickRecurrence: (recurrence: CaptureRecurrence) => void
  readonly onSelectDestination: (destination: CaptureDestination) => void
  readonly onDiscard: () => void
  readonly onSubmit: () => void
}

export function CapturePromptFragment(props: CapturePromptFragmentProps) {
  const { isOpen, draft, presentation, onDiscard } = props
  const isSheet = presentation === 'sheet'

  const heading = (
    <>
      {/*
        Radix needs a Title and a Description for the dialog's accessible name.
        Canon's sheet draws neither — the kind chips ARE the title — so both are
        announced and not shown, carrying canon's own
        `accessibilityLabel("New \(kind.label)")` verbatim.
      */}
      <DialogTitle className="sr-only">
        {`New ${captureKindLabel(draft.kind)}`}
      </DialogTitle>
      <DialogDescription className="sr-only">
        {captureKindPlaceholder(draft.kind)}
      </DialogDescription>
    </>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onDiscard()
      }}
    >
      {isSheet ? (
        <SheetContent
          hideClose
          side="bottom"
          data-testid="capture-prompt"
          data-kro-presentation="sheet"
          className="h-auto gap-0 p-0"
        >
          {heading}
          <PromptForm {...props} />
        </SheetContent>
      ) : (
        <DialogContent
          hideClose
          data-testid="capture-prompt"
          data-kro-presentation="popover"
          className={cn(
            'top-auto right-6 bottom-6 left-auto',
            'translate-x-0 translate-y-0',
            'flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-y-auto p-0',
          )}
          style={{
            width: `${CAPTURE_PROMPT_POPOVER_WIDTH}px`,
            maxWidth: 'calc(100vw - 3rem)',
            // `p-kro-large` / `gap-kro-medium` on DialogContent do not lose
            // to `p-0 gap-0` — twMerge does not treat the kro-* spacing
            // utilities as the same group. Inline wins, which is what keeps
            // the desktop popover compact.
            padding: 0,
            gap: 0,
          }}
        >
          {heading}
          <PromptForm {...props} />
        </DialogContent>
      )}
    </Dialog>
  )
}

/* ------------------------------------------------------------------------ */
/* The form                                                                  */
/* ------------------------------------------------------------------------ */

function PromptForm({
  isOpen,
  draft,
  isEditingStartTime,
  isEditingEndTime,
  availableDestinations,
  canSubmit,
  blockedReason,
  presentation,
  now,
  locale,
  onEditTitle,
  onSelectKind,
  onPickDate,
  onClearDate,
  onBeginTimeEdit,
  onPickTime,
  onEndTimeEdit,
  onPickRewards,
  onPickRecurrence,
  onSelectDestination,
  onDiscard,
  onSubmit,
}: CapturePromptFragmentProps) {
  const [panel, setPanel] = useState<PromptPanel>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)

  // Canon waits out the sheet's presentation animation and then focuses the
  // title (`.task(id:)` plus a 350 ms sleep). Radix hands focus to the panel's
  // first focusable node — the leading kind chip — so the field claims it back
  // here. `isOpen` is the dependency for canon's own reason: a re-presented
  // prompt is a fresh draft and has to be typeable immediately.
  useEffect(() => {
    if (!isOpen) return
    titleRef.current?.focus()
  }, [isOpen])

  const isEvent = draft.kind === CaptureKind.event
  const isHabit = draft.kind === CaptureKind.habit
  const earnsRewards = draft.kind === CaptureKind.task || isHabit
  const isCompact = presentation === 'popover'

  /** Canon closes any open editor when another one expands. */
  const closeOpenTimeEditors = () => {
    // `done`, not `discard`: the value the user landed on is kept, which is
    // what `isShowingTimePicker = false` does on the Swift side.
    if (isEditingStartTime) onEndTimeEdit('start', 'done')
    if (isEditingEndTime) onEndTimeEdit('end', 'done')
  }

  const togglePanel = (next: Exclude<PromptPanel, null>) => {
    setPanel((current) => (current === next ? null : next))
    closeOpenTimeEditors()
  }

  const toggleTimeEdit = (field: CaptureTimeField) => {
    setPanel(null)
    const isEditingThis =
      field === 'start' ? isEditingStartTime : isEditingEndTime
    if (isEditingThis) {
      onEndTimeEdit(field, 'done')
      return
    }
    closeOpenTimeEditors()
    onBeginTimeEdit(field)
  }

  return (
    <div
      className="flex flex-col"
      data-slot="capture-prompt-form"
      data-kro-density={isCompact ? 'compact' : 'touch'}
    >
      {/* ── Kind picker ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex gap-2 overflow-x-auto px-3',
          isCompact ? 'pt-2 pb-2' : 'pt-4 pb-3',
        )}
        role="group"
        aria-label="Kind"
      >
        {captureKinds.map((kind) => (
          <KindChip
            key={kind}
            kind={kind}
            isSelected={kind === draft.kind}
            isCompact={isCompact}
            onSelect={() => {
              setPanel(null)
              onSelectKind(kind)
            }}
          />
        ))}
      </div>

      <Separator />

      {/* ── Title ───────────────────────────────────────────────────── */}
      <input
        ref={titleRef}
        data-testid="capture-title"
        aria-label="Title"
        className={cn(
          'w-full bg-transparent outline-none',
          isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3.5 text-base',
          'placeholder:text-kro-fore-secondary',
        )}
        style={{ color: colorVar('fore') }}
        placeholder={captureKindPlaceholder(draft.kind)}
        value={draft.title}
        onChange={(event) => onEditTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !canSubmit) return
          event.preventDefault()
          onSubmit()
        }}
      />

      <Separator />

      {/* ── Date / time row ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col',
          isCompact ? 'gap-1.5 py-1.5' : 'gap-2 py-2.5',
        )}
      >
        <div className="flex gap-2 overflow-x-auto px-3">
          {earnsRewards ? (
            <PromptChip
              isCompact={isCompact}
              glyph={<Star size={12} aria-hidden />}
              label={String(draft.rewards)}
              isSet
              isExpanded={panel === 'rewards'}
              accessibilityLabel={`Rewards: ${draft.rewards} points`}
              onSelect={() => togglePanel('rewards')}
            />
          ) : null}

          {isHabit ? null : (
            <>
              <PromptChip
                isCompact={isCompact}
                glyph={<CalendarGlyph size={12} aria-hidden />}
                label={
                  draft.hasDate
                    ? formatCaptureDate(draft.date, now, locale)
                    : 'No date'
                }
                isSet={draft.hasDate}
                isExpanded={panel === 'date'}
                accessibilityLabel={
                  draft.hasDate
                    ? `Date: ${formatCaptureDate(draft.date, now, locale)}`
                    : 'Date: No date'
                }
                onSelect={() => togglePanel('date')}
              />
              {/*
                Never offered for an Event — canon's `Endeavor.event(...)` has
                no way to represent one without a start, and `withDateCleared`
                enforces the same invariant at the state layer (`KC-IS-#75`).
              */}
              {!isEvent && draft.hasDate ? (
                <ClearButton
                  label="Clear date"
                  isCompact={isCompact}
                  onSelect={onClearDate}
                />
              ) : null}
            </>
          )}

          <PromptChip
            isCompact={isCompact}
            glyph={<ClockGlyph size={12} aria-hidden />}
            label={
              draft.hasTime
                ? formatCaptureTime(draft.time, locale)
                : isEvent
                  ? 'Start'
                  : 'No time'
            }
            isSet={draft.hasTime}
            isExpanded={isEditingStartTime}
            accessibilityLabel={isEvent ? 'Start time' : 'Time'}
            onSelect={() => toggleTimeEdit('start')}
          />

          {isEvent ? (
            <>
              <PromptChip
                isCompact={isCompact}
                glyph={<ClockEndGlyph size={12} aria-hidden />}
                label={
                  draft.hasEndTime
                    ? formatCaptureTime(draft.endTime, locale)
                    : 'End'
                }
                isSet={draft.hasEndTime}
                isExpanded={isEditingEndTime}
                accessibilityLabel="End time"
                onSelect={() => toggleTimeEdit('end')}
              />
              {draft.hasEndTime ? (
                <ClearButton
                  label="Clear end time"
                  isCompact={isCompact}
                  onSelect={() => onEndTimeEdit('end', 'clear')}
                />
              ) : null}
            </>
          ) : draft.hasTime ? (
            <ClearButton
              label="Clear time"
              isCompact={isCompact}
              onSelect={() => onEndTimeEdit('start', 'clear')}
            />
          ) : null}

          <PromptChip
            isCompact={isCompact}
            glyph={<RepeatGlyph size={12} aria-hidden />}
            label={captureRepeatChipLabel(draft.recurrence)}
            isSet={draft.recurrence.kind !== 'never'}
            isExpanded={panel === 'repeat'}
            accessibilityLabel={
              draft.recurrence.kind === 'never'
                ? 'Set repeat schedule'
                : `Repeat: ${captureRepeatChipLabel(draft.recurrence)}`
            }
            onSelect={() => togglePanel('repeat')}
          />
        </div>

        {panel === 'date' && !isHabit ? (
          <div className="px-3">
            <Input
              type="date"
              aria-label="Due date"
              data-testid="capture-date-input"
              // Canon's `in: Calendar.current.startOfDay(for: .now)...` — a
              // capture is never scheduled into the past.
              min={dateInputValue(now)}
              value={dateInputValue(draft.date)}
              onChange={(event) => {
                const parsed = parseDateInput(event.target.value)
                if (parsed !== null) onPickDate(parsed)
              }}
            />
          </div>
        ) : null}

        {isEditingStartTime ? (
          <TimePanel
            field="start"
            label={isEvent ? 'Start time' : 'Time'}
            value={draft.time}
            day={draft.date}
            onPick={onPickTime}
            onEnd={onEndTimeEdit}
          />
        ) : null}

        {isEditingEndTime && isEvent ? (
          <TimePanel
            field="end"
            label="End time"
            value={draft.endTime}
            day={draft.date}
            onPick={onPickTime}
            onEnd={onEndTimeEdit}
          />
        ) : null}

        {panel === 'rewards' && earnsRewards ? (
          <RewardsEditor
            points={draft.rewards}
            isCompact={isCompact}
            onPick={onPickRewards}
          />
        ) : null}

        {panel === 'repeat' ? (
          <div
            className="flex flex-wrap gap-2 px-3 py-1"
            role="group"
            aria-label="Repeat"
            data-testid="capture-repeat-panel"
          >
            {captureRecurrencePresets(draft.date).map((preset) => (
              <PromptChip
                key={preset.id}
                isCompact={isCompact}
                label={preset.label}
                isSet={preset.recurrence.kind === draft.recurrence.kind}
                isExpanded={preset.recurrence.kind === draft.recurrence.kind}
                accessibilityLabel={preset.label}
                onSelect={() => {
                  onPickRecurrence(preset.recurrence)
                  setPanel(null)
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <Separator />

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col px-3',
          isCompact ? 'gap-1.5 py-2' : 'gap-2 py-3',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <DestinationPicker
            selected={draft.destination}
            available={availableDestinations}
            isExpanded={panel === 'destination'}
            isCompact={isCompact}
            onToggle={() => togglePanel('destination')}
            onSelect={(destination) => {
              onSelectDestination(destination)
              setPanel(null)
            }}
          />

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size={isCompact ? 'sm' : 'pill'}
              className="w-24 px-0"
              aria-label={`Discard new ${captureKindLabel(draft.kind).toLowerCase()}`}
              onClick={onDiscard}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size={isCompact ? 'sm' : 'pill'}
              className="w-24 px-0"
              data-testid="capture-add"
              disabled={!canSubmit}
              // A disabled control leaves the action surface of the a11y tree,
              // so the reason is attached to it explicitly. This is the epic's
              // "disabled submit controls name what blocks them" rule; canon
              // (a bare `.disabled(!canSubmit)`) has no equivalent.
              aria-describedby={
                blockedReason === null ? undefined : 'capture-blocked-reason'
              }
              onClick={onSubmit}
            >
              Add
            </Button>
          </div>
        </div>

        {/*
          Always mounted, so a screen reader announces the reason CHANGING
          (untitled -> event missing a start) rather than only its arrival.
        */}
        <p
          id="capture-blocked-reason"
          data-testid="capture-blocked-reason"
          aria-live="polite"
          className={cn('m-0 text-sm', blockedReason === null && 'sr-only')}
          style={{ color: colorVar('foreSecondary') }}
        >
          {blockedReason ?? ''}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Parts                                                                     */
/* ------------------------------------------------------------------------ */

function Separator() {
  return (
    <div
      aria-hidden
      className="h-px w-full shrink-0"
      style={{ backgroundColor: colorVar('hairline') }}
    />
  )
}

function KindChip({
  kind,
  isSelected,
  isCompact,
  onSelect,
}: {
  readonly kind: CaptureKind
  readonly isSelected: boolean
  readonly isCompact: boolean
  readonly onSelect: () => void
}) {
  const Glyph = captureIconFor(captureKindGlyph(kind))
  return (
    <button
      type="button"
      // A toggle-button group rather than a radiogroup: radios owe the user
      // arrow-key roving focus, and claiming the role without implementing it
      // is worse than not claiming it. `aria-pressed` is canon's
      // `.accessibilityAddTraits(.isSelected)` on the web.
      aria-pressed={isSelected}
      aria-label={captureKindLabel(kind)}
      onClick={onSelect}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-kro-pill',
        isCompact
          ? 'px-2.5 font-semibold text-xs'
          : 'px-3 font-semibold text-sm',
        'kro-motion-quick transition-[background-color,color]',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        minHeight: promptControlMinHeight(isCompact),
        backgroundColor: isSelected ? colorVar('accent') : 'transparent',
        color: isSelected ? colorVar('onAccent') : colorVar('foreSecondary'),
      }}
    >
      <Glyph size={isCompact ? 11 : 13} aria-hidden />
      {captureKindLabel(kind)}
    </button>
  )
}

function PromptChip({
  glyph,
  label,
  isSet,
  isExpanded,
  isCompact,
  accessibilityLabel,
  onSelect,
}: {
  readonly glyph?: ReactNode
  readonly label: string
  readonly isSet: boolean
  readonly isExpanded: boolean
  readonly isCompact: boolean
  readonly accessibilityLabel: string
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-label={accessibilityLabel}
      aria-expanded={isExpanded}
      onClick={onSelect}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-kro-pill',
        isCompact ? 'px-2 font-medium text-xs' : 'px-2.5 font-medium text-sm',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        minHeight: promptControlMinHeight(isCompact),
        backgroundColor: isExpanded
          ? `color-mix(in srgb, ${colorVar('accent')} 15%, transparent)`
          : colorVar('backInner'),
        color: isSet ? colorVar('fore') : colorVar('foreSecondary'),
      }}
    >
      {glyph}
      {label}
    </button>
  )
}

function ClearButton({
  label,
  isCompact,
  onSelect,
}: {
  readonly label: string
  readonly isCompact: boolean
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onSelect}
      className="inline-flex shrink-0 items-center justify-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        minWidth: promptControlMinHeight(isCompact),
        minHeight: promptControlMinHeight(isCompact),
        color: colorVar('foreSecondary'),
      }}
    >
      <ClearGlyph size={16} aria-hidden />
    </button>
  )
}

/** Canon's inline `timePickerPanel` — the value, then Discard / Clear / Done. */
function TimePanel({
  field,
  label,
  value,
  day,
  onPick,
  onEnd,
}: {
  readonly field: CaptureTimeField
  readonly label: string
  readonly value: Date
  readonly day: Date
  readonly onPick: (field: CaptureTimeField, time: Date) => void
  readonly onEnd: (
    field: CaptureTimeField,
    outcome: CaptureTimeEditOutcome,
  ) => void
}) {
  return (
    <div
      className="flex flex-col gap-2 px-3"
      data-testid={`capture-time-panel-${field}`}
    >
      <Input
        type="time"
        aria-label={label}
        value={timeInputValue(value)}
        onChange={(event) => {
          const parsed = parseTimeInput(event.target.value, day)
          if (parsed !== null) onPick(field, parsed)
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEnd(field, 'discard')}
        >
          Discard
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEnd(field, 'clear')}
        >
          Clear
        </Button>
        <span className="flex-1" />
        <Button
          variant="primary"
          size="sm"
          onClick={() => onEnd(field, 'done')}
        >
          <Check size={12} aria-hidden />
          Done
        </Button>
      </div>
    </div>
  )
}

/** Canon's inline `rewardsEditor` — the 1…999 stepper, 5/10 by magnitude. */
function RewardsEditor({
  points,
  isCompact,
  onPick,
}: {
  readonly points: number
  readonly isCompact: boolean
  readonly onPick: (points: number) => void
}) {
  return (
    <div
      className="flex items-center gap-4 px-3 py-1"
      data-testid="capture-rewards-editor"
    >
      <span
        className={isCompact ? 'text-xs' : 'text-sm'}
        style={{ color: colorVar('foreSecondary') }}
      >
        Reward points
      </span>
      <span className="flex-1" />
      <div
        className="flex items-center"
        style={{
          borderRadius: radiusVar('field'),
          backgroundColor: colorVar('backInner'),
        }}
      >
        <Button
          variant="ghost"
          size={isCompact ? 'icon-sm' : 'icon'}
          aria-label="Decrease reward points"
          disabled={points <= MINIMUM_CAPTURE_REWARDS}
          onClick={() => onPick(points - captureRewardStep(points))}
        >
          −
        </Button>
        <span
          className={cn(
            'min-w-9 text-center font-semibold',
            isCompact ? 'text-sm' : 'text-base',
          )}
          style={{ color: colorVar('fore') }}
        >
          {points}
        </span>
        <Button
          variant="ghost"
          size={isCompact ? 'icon-sm' : 'icon'}
          aria-label="Increase reward points"
          disabled={points >= MAXIMUM_CAPTURE_REWARDS}
          onClick={() => onPick(points + captureRewardStep(points))}
        >
          +
        </Button>
      </div>
      <Star size={14} aria-hidden style={{ color: colorVar('rewardYellow') }} />
    </div>
  )
}

/**
 * Canon's `destinationMenu`, as an inline disclosure rather than a popper.
 *
 * A Radix `DropdownMenu` is built on `@radix-ui/react-popper`, which this repo
 * cannot mount in a test: the measurement recorded in
 * `design/system/primitives/__tests__/radixEnvironment.tsx` is 5–12 SECONDS per
 * mount under jsdom, enough to fail `make test` outright. An inline disclosure
 * is also the idiom every other expanding control in this form already uses, so
 * the panel gains no second grammar.
 */
function DestinationPicker({
  selected,
  available,
  isExpanded,
  isCompact,
  onToggle,
  onSelect,
}: {
  readonly selected: CaptureDestination
  readonly available: readonly CaptureDestination[]
  readonly isExpanded: boolean
  readonly isCompact: boolean
  readonly onToggle: () => void
  readonly onSelect: (destination: CaptureDestination) => void
}) {
  const SelectedGlyph = captureIconFor(captureDestinationGlyph(selected))

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        aria-label={`Hosting destination: ${captureDestinationLabel(selected)}`}
        aria-expanded={isExpanded}
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-kro-pill px-2.5',
          isCompact ? 'font-medium text-xs' : 'font-medium text-sm',
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
        )}
        style={{
          minHeight: promptControlMinHeight(isCompact),
          color: colorVar('fore'),
        }}
      >
        <SelectedGlyph size={14} aria-hidden />
        {captureDestinationLabel(selected)}
        <ChevronDown size={10} aria-hidden />
      </button>

      {isExpanded ? (
        <div
          role="group"
          aria-label="Hosting destination"
          data-testid="capture-destination-options"
          className="flex flex-col gap-1"
        >
          {available.map((destination) => {
            const Glyph = captureIconFor(captureDestinationGlyph(destination))
            return (
              <button
                key={destination}
                type="button"
                aria-pressed={destination === selected}
                onClick={() => onSelect(destination)}
                className={cn(
                  'inline-flex w-full items-center gap-1.5 rounded-kro-small px-2.5',
                  isCompact ? 'text-xs' : 'text-sm',
                  'outline-none focus-visible:shadow-[var(--kro-ring)]',
                )}
                style={{
                  minHeight: promptControlMinHeight(isCompact),
                  color: colorVar('fore'),
                  backgroundColor:
                    destination === selected
                      ? colorVar('backInner')
                      : 'transparent',
                }}
              >
                <Glyph size={14} aria-hidden />
                {captureDestinationLabel(destination)}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
