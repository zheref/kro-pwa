/**
 * The three compact popovers an endeavor card presents — canon
 * `KroUI/Components/EndeavorCard.swift`: `MarkCompletePopover`, `DeferPopover`
 * and `DeleteConfirmationPopover`.
 *
 * `MarkCompletePopover` is the BACKDATE surface, and `docs/Features/EndeavorCard.md`
 * spells out why it exists rather than completing on tap: *"This allows users to
 * backdate completions for tasks they finished earlier but forgot to mark
 * complete at the time."* So the checkmark is a TRIGGER, never the completion —
 * the card raises `onMarkComplete(model, completionDate)` only after Confirm.
 *
 * ## The date/time control
 *
 * Canon uses `DatePicker(.compact)` with `[.date, .hourAndMinute]`. The web's
 * one-control equivalent is `<input type="datetime-local">`, which is the
 * platform's own compact picker: it opens the native calendar+clock on every
 * modern browser, is keyboard-operable without one, and — unlike a hand-rolled
 * calendar grid — is already localized and already accessible. It is themed
 * through the design system's `Input` primitive so it matches every other field.
 *
 * `datetime-local` has no time zone, which is correct here: the user is naming a
 * wall-clock moment in their own zone, exactly as the SwiftUI picker does. The
 * conversion is one function, `localInputValue` / `parseLocalInput`, tested
 * rather than inlined at three call sites.
 *
 * ## Presentation
 *
 * All three render into the design system's `PopoverContent`, which is the
 * KroGlass panel with the epic's desktop popover idiom. On a phone width the
 * shell decides whether a sheet is the better host; this component owns the
 * CONTENT, not the presentation — `.presentationCompactAdaptation(.popover)` in
 * canon makes the same separation.
 */

import { useEffect, useState } from 'react'
import { Button } from '../system/primitives/button'
import { Input } from '../system/primitives/input'
import { colorVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { endeavorIcon } from './endeavorIcons'

const Check = endeavorIcon('checkmark')
const Trash = endeavorIcon('trash')
const Skip = endeavorIcon('forward.end')

/** Seconds in a day — the defer default's 24-hour step. */
const DAY_SECONDS = 86_400

/**
 * A `Date` as the `YYYY-MM-DDTHH:mm` string `datetime-local` expects, in the
 * runtime's own zone.
 *
 * NOT `toISOString().slice(0, 16)`: that converts to UTC first, so a user in
 * UTC+2 opening the picker at 09:00 would see 07:00. The bug is invisible in a
 * UTC-pinned CI and obvious to every user who is not in London.
 */
export function localInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('')
}

/**
 * The inverse. Returns `null` for the empty or half-typed value the input
 * allows while the user is still typing.
 *
 * The shape check is not belt-and-braces: `new Date('2026-04-')` resolves to a
 * real date in V8 (the 1st, at midnight UTC), so a `Number.isNaN` guard alone
 * would let a half-typed value through as a confident, wrong answer — and
 * marking a task complete on the wrong day is precisely what this surface
 * exists to let the user avoid.
 */
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

export function parseLocalInput(value: string): Date | null {
  if (!LOCAL_DATETIME.test(value)) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Canon's `defaultDeferTarget`: the existing due time plus 24 hours when there
 * is one, otherwise tomorrow at 9 AM.
 */
export function defaultDeferTarget(dueTime: Date | null, now: Date): Date {
  if (dueTime !== null) return new Date(dueTime.getTime() + DAY_SECONDS * 1000)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  return tomorrow
}

function PopoverShell({
  title,
  children,
}: {
  readonly title: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="flex min-w-65 flex-col gap-3.5">
      <p
        className="m-0 text-base font-semibold"
        style={{ color: colorVar('fore') }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Mark complete — the backdate surface                                      */
/* ------------------------------------------------------------------------ */

export interface MarkCompletePopoverProps {
  readonly initialDate: Date
  readonly onConfirm: (completedAt: Date) => void
  readonly onCancel: () => void
}

export function MarkCompletePopover({
  initialDate,
  onConfirm,
  onCancel,
}: MarkCompletePopoverProps) {
  const [value, setValue] = useState(() => localInputValue(initialDate))

  // Canon's `.onAppear { completionDate = initialDate }` — the popover is
  // re-seeded each time it is presented, so yesterday's edit does not persist
  // into today's completion.
  useEffect(() => {
    setValue(localInputValue(initialDate))
  }, [initialDate])

  const parsed = parseLocalInput(value)

  return (
    <PopoverShell title="Mark complete">
      <Input
        type="datetime-local"
        aria-label="Completed at"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={parsed === null}
          onClick={() => {
            if (parsed !== null) onConfirm(parsed)
          }}
        >
          Mark
          <Check size={16} aria-hidden />
        </Button>
      </div>
    </PopoverShell>
  )
}

/* ------------------------------------------------------------------------ */
/* Defer                                                                     */
/* ------------------------------------------------------------------------ */

export interface DeferPopoverProps {
  readonly initialTarget: Date
  readonly onConfirm: (target: Date) => void
  /** Canon offers Skip alongside Defer from the overflow menu, not the button. */
  readonly onSkip?: () => void
}

export function DeferPopover({
  initialTarget,
  onConfirm,
  onSkip,
}: DeferPopoverProps) {
  const [value, setValue] = useState(() => localInputValue(initialTarget))

  useEffect(() => {
    setValue(localInputValue(initialTarget))
  }, [initialTarget])

  const parsed = parseLocalInput(value)

  return (
    <PopoverShell title="Defer until">
      <Input
        type="datetime-local"
        aria-label="Defer to"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        {onSkip === undefined ? (
          <span />
        ) : (
          <Button variant="secondary" onClick={onSkip}>
            <Skip size={16} aria-hidden />
            Skip
          </Button>
        )}
        <Button
          variant="primary"
          disabled={parsed === null}
          onClick={() => {
            if (parsed !== null) onConfirm(parsed)
          }}
        >
          Defer
        </Button>
      </div>
    </PopoverShell>
  )
}

/* ------------------------------------------------------------------------ */
/* Delete confirmation                                                       */
/* ------------------------------------------------------------------------ */

export interface DeleteConfirmationPopoverProps {
  readonly title: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function DeleteConfirmationPopover({
  title,
  onConfirm,
  onCancel,
}: DeleteConfirmationPopoverProps) {
  return (
    <PopoverShell title={`Delete "${title}"?`}>
      <p className="m-0 text-sm" style={{ color: colorVar('foreSecondary') }}>
        This cannot be undone. The endeavor will be permanently removed from all
        sources.
      </p>
      <div className={cn('flex items-center justify-between gap-3')}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          <Trash size={16} aria-hidden />
          Delete
        </Button>
      </div>
    </PopoverShell>
  )
}
