'use client'

/**
 * The Inbox — canon `KroUI/Inbox/InboxView.swift`, as one pure Fragment
 * (`RC-15`: it dispatches nothing; every intent arrives as a callback prop).
 *
 * ## One Fragment, three presentations
 *
 * Canon renders the same `InboxView` into three hosts: the phone's sheet, the
 * Mac's 560 x 620 toolbar popover, and — through the sidebar's "Jot Down" row —
 * a full destination. The body never changes; only the chrome around it does.
 * So this Fragment takes a `presentation` and supplies the chrome itself:
 *
 *   · `sheet`     the handheld bottom sheet.
 *   · `popover`   the desktop panel, framed by `PRESENTATION_SIZE.inbox`
 *                 (560 x 620) — the shell's own ported constant, never a
 *                 fifth copy of the numbers.
 *   · `inline`    the `/inbox` destination page, filling the shell's content
 *                 area. No dialog, no overlay, no dismiss control: a
 *                 destination is not dismissed, it is navigated away from.
 *
 * ## The pinned header
 *
 * Canon's `VStack(spacing: 0) { header; List }` plus the empty state's
 * `frame(maxHeight: .infinity)` is the acceptance criterion in one line: *the
 * header stays pinned at the top and the tray illustration is centred in the
 * remaining space*, so the sheet does not visually collapse around it. Here
 * that is a flex column — a `shrink-0` header over a `flex-1` body — and the
 * empty state's own `flex-1 justify-center` does the centring.
 *
 * ## Add for Today is expanded inline, not popped over
 *
 * Canon anchors a `SchedulePopover` to the row's button. A Radix popover is
 * built on `@radix-ui/react-popper`, which this repo cannot mount in a test:
 * the measurement in `design/system/primitives/__tests__/radixEnvironment.tsx`
 * records 5–12 SECONDS per mount under jsdom, enough to fail `make test`
 * outright — and the add-for-today -> undo interaction test is a requirement of
 * KC-IS-#24, so the confirm surface has to be drivable. It expands under its
 * row instead, which is also the idiom the capture prompt already uses for
 * every one of its own pickers. Same content, same one-tap confirm, same
 * next-quarter-hour prefill.
 */

import type { EndeavorCapabilities, EndeavorOperation } from '@kro/core'
import type { ReactNode } from 'react'
import { CompactPresentationHeader } from '../../../design/endeavor/CompactPresentationHeader'
import { InboxTrayEmptyState } from '../../../design/endeavor/EmptyDayStateView'
import { EndeavorRow } from '../../../design/endeavor/EndeavorRow'
import type { EndeavorCardModel } from '../../../design/endeavor/endeavorCardModel'
import {
  type InputCapability,
  useInputCapability,
} from '../../../design/endeavor/useInputCapability'
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
import { PRESENTATION_SIZE } from '../../main/MainPresentation'
import type { CaptureAddForTodayState } from '../CaptureFeature'
import { captureIcon, captureIconFor } from './captureIcons'
import {
  type InboxRowLayout,
  inboxCountCaption,
  inboxRowConfigFor,
  parseTimeInput,
  timeInputValue,
} from './capturePresentation'

const Sparkles = captureIcon('sparkles')
const TrayFull = captureIcon('tray.full')
const TriageGlyph = captureIconFor('rectangle.split.2x2.fill')
const AddForTodayGlyph = captureIconFor('calendar.badge.plus')

/** How the Inbox is hosted. `inline` is the `/inbox` destination page. */
export type InboxPresentation = 'sheet' | 'popover' | 'inline'

/**
 * `position: fixed`, inline, for the reason spelled out in
 * `CapturePromptFragment`: `glass.css`'s unlayered `.kro-glass` sets
 * `position: relative`, which outranks Tailwind's layered `fixed` utility on
 * every glass panel in the repo. Reported against KC-IS-#6's lane; when the
 * one-line fix lands there, this deletes.
 */
const PINNED_TO_VIEWPORT = { position: 'fixed' } as const

/**
 * The width the row's own pointer chrome occupies at its trailing edge.
 *
 * `EndeavorActionSurface` overlays two things on the right of every row it
 * wraps: the hover-revealed action strip (`right-2`, one 28px button per
 * binding, 4px apart — 8 + 28 + 4 + 28 = 68 for the Inbox vista's two) and the
 * context-menu trigger (28px at `top-1 right-1`). Both become clickable on
 * hover, and both sit exactly where canon puts the Inbox's two explicit
 * buttons — so without a reserved gutter the kit's chrome covers Triage and Add
 * for Today and a pointer can never reach them.
 *
 * Reserved only on pointer, because on touch neither overlay is drawn.
 * The number is measured from the kit rather than exported by it; that the kit
 * does not reserve its own gutter when a row carries `trailing` is reported
 * against KC-IS-#14's lane with this PR.
 */
const POINTER_ACTION_GUTTER_PX = 72

export interface InboxFragmentProps {
  /** Ignored by `inline`, which is always on screen. */
  readonly isOpen: boolean
  readonly presentation: InboxPresentation
  /** Canon's `justCreatedCardSelector` — one row, or none. */
  readonly justCreated: EndeavorCardModel | null
  /** Canon's `pendingTriageSelector`, newest first. */
  readonly pendingTriage: readonly EndeavorCardModel[]
  readonly totalCount: number
  readonly isEmpty: boolean
  /** The Inbox vista's declared row operations — swipe on touch, hover on pointer. */
  readonly capabilities: EndeavorCapabilities
  readonly rowLayout: InboxRowLayout
  /** The open Add-for-Today confirm, or `null`. */
  readonly addForToday: CaptureAddForTodayState | null
  readonly now: Date
  readonly locale?: string
  /** Forces the row input grammar. Stories and tests only; production detects it. */
  readonly input?: InputCapability

  readonly onDismiss: () => void
  readonly onTapTriage: (endeavorId: string) => void
  readonly onRequestAddForToday: (endeavorId: string) => void
  readonly onAdjustAddForTodayTime: (time: Date) => void
  readonly onCancelAddForToday: () => void
  readonly onConfirmAddForToday: () => void
  readonly onOperation: (
    operation: EndeavorOperation,
    endeavorId: string,
  ) => void
}

export function InboxFragment(props: InboxFragmentProps) {
  const { isOpen, presentation, onDismiss } = props

  if (presentation === 'inline') {
    return (
      <section
        data-testid="inbox-surface"
        data-kro-presentation="inline"
        aria-label="Inbox"
        className="flex h-full min-h-0 w-full flex-col"
      >
        <InboxBody {...props} />
      </section>
    )
  }

  const heading = (
    <>
      <DialogTitle className="sr-only">Inbox</DialogTitle>
      <DialogDescription className="sr-only">
        {inboxCountCaption(props.totalCount) ?? 'Nothing to triage.'}
      </DialogDescription>
    </>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onDismiss()
      }}
    >
      {presentation === 'sheet' ? (
        <SheetContent
          hideClose
          side="bottom"
          data-testid="inbox-surface"
          data-kro-presentation="sheet"
          className="flex h-[85vh] flex-col gap-0 p-0"
          style={PINNED_TO_VIEWPORT}
        >
          {heading}
          <InboxBody {...props} />
        </SheetContent>
      ) : (
        <DialogContent
          hideClose
          data-testid="inbox-surface"
          data-kro-presentation="popover"
          className="flex max-w-none flex-col gap-0 p-0"
          // Canon's `InboxScreen(...).frame(width: 560, height: 620)` on
          // `macInboxButton`'s popover, read from the shell's ported table so
          // the two can never disagree.
          style={{
            ...PINNED_TO_VIEWPORT,
            width: `${PRESENTATION_SIZE.inbox.width}px`,
            height: `${PRESENTATION_SIZE.inbox.height}px`,
            maxWidth: 'calc(100vw - 3rem)',
            maxHeight: 'calc(100dvh - 3rem)',
          }}
        >
          {heading}
          <InboxBody {...props} />
        </DialogContent>
      )}
    </Dialog>
  )
}

/* ------------------------------------------------------------------------ */
/* Body                                                                      */
/* ------------------------------------------------------------------------ */

function InboxBody({
  presentation,
  justCreated,
  pendingTriage,
  totalCount,
  isEmpty,
  capabilities,
  rowLayout,
  addForToday,
  now,
  locale,
  input,
  onDismiss,
  onTapTriage,
  onRequestAddForToday,
  onAdjustAddForTodayTime,
  onCancelAddForToday,
  onConfirmAddForToday,
  onOperation,
}: InboxFragmentProps) {
  const rowProps = {
    capabilities,
    rowLayout,
    addForToday,
    now,
    locale,
    input,
    onTapTriage,
    onRequestAddForToday,
    onAdjustAddForTodayTime,
    onCancelAddForToday,
    onConfirmAddForToday,
    onOperation,
  }

  return (
    <>
      <InboxHeader
        presentation={presentation}
        rowLayout={rowLayout}
        totalCount={totalCount}
        onDismiss={onDismiss}
      />

      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <InboxTrayEmptyState />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2">
          {justCreated === null ? null : (
            <InboxSection
              title="Just Created"
              glyph={<Sparkles size={14} aria-hidden />}
              cards={[justCreated]}
              {...rowProps}
            />
          )}
          {pendingTriage.length === 0 ? null : (
            <InboxSection
              title="Pending Triage"
              glyph={<TrayFull size={14} aria-hidden />}
              cards={pendingTriage}
              {...rowProps}
            />
          )}
        </div>
      )}
    </>
  )
}

/**
 * Canon's `header`: the compact presentation header on a pointer-first surface,
 * the title + Done row otherwise.
 *
 * The destination presentation drops the dismiss control in both shapes — the
 * shell's own chrome carries the heading there, and a page has nothing to
 * dismiss.
 */
function InboxHeader({
  presentation,
  rowLayout,
  totalCount,
  onDismiss,
}: {
  readonly presentation: InboxPresentation
  readonly rowLayout: InboxRowLayout
  readonly totalCount: number
  readonly onDismiss: () => void
}) {
  const caption = inboxCountCaption(totalCount)
  const isDestination = presentation === 'inline'

  if (rowLayout === 'compactDesktop') {
    return (
      <div className="shrink-0">
        <CompactPresentationHeader
          title="Inbox"
          subtitle={caption}
          leadingAction={
            isDestination ? undefined : { kind: 'dismiss', onPress: onDismiss }
          }
        />
      </div>
    )
  }

  return (
    <header className="flex shrink-0 items-center gap-3 px-5 pt-4 pb-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className="m-0 font-bold text-xl"
          style={{ color: colorVar('fore') }}
        >
          Inbox
        </p>
        {caption === undefined ? null : (
          <p
            className="m-0 text-sm"
            style={{ color: colorVar('foreSecondary') }}
          >
            {caption}
          </p>
        )}
      </div>
      <span className="flex-1" />
      {isDestination ? null : (
        <Button variant="ghost" onClick={onDismiss}>
          Done
        </Button>
      )}
    </header>
  )
}

type SectionProps = {
  readonly title: string
  readonly glyph: ReactNode
  readonly cards: readonly EndeavorCardModel[]
} & Pick<
  InboxFragmentProps,
  | 'capabilities'
  | 'rowLayout'
  | 'addForToday'
  | 'now'
  | 'locale'
  | 'input'
  | 'onTapTriage'
  | 'onRequestAddForToday'
  | 'onAdjustAddForTodayTime'
  | 'onCancelAddForToday'
  | 'onConfirmAddForToday'
  | 'onOperation'
>

function InboxSection({ title, glyph, cards, ...row }: SectionProps) {
  const compact = row.rowLayout === 'compactDesktop'
  return (
    <section
      aria-label={title}
      data-testid={`inbox-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn('flex flex-col gap-2', compact ? 'px-2.5' : 'px-4')}
    >
      <header className="flex items-center gap-2 pt-2">
        <span style={{ color: colorVar('foreSecondary') }}>{glyph}</span>
        <h3
          className="m-0 font-semibold text-sm"
          style={{ color: colorVar('foreSecondary') }}
        >
          {title}
        </h3>
        <span className="flex-1" />
        <span
          className="rounded-kro-pill px-2 py-0.5 font-bold text-xs"
          style={{
            color: colorVar('foreSecondary'),
            backgroundColor: `color-mix(in srgb, ${colorVar('fore')} 8%, transparent)`,
          }}
        >
          {cards.length}
        </span>
      </header>

      <ul className={cn('m-0 flex list-none flex-col p-0', compact ? 'gap-1' : 'gap-2')}>
        {cards.map((card) => (
          <li key={card.id}>
            <InboxRow card={card} {...row} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------------ */
/* Row                                                                       */
/* ------------------------------------------------------------------------ */

function InboxRow({
  card,
  capabilities,
  rowLayout,
  addForToday,
  now,
  locale,
  input,
  onTapTriage,
  onRequestAddForToday,
  onAdjustAddForTodayTime,
  onCancelAddForToday,
  onConfirmAddForToday,
  onOperation,
}: { readonly card: EndeavorCardModel } & Omit<SectionProps, 'title' | 'glyph' | 'cards'>) {
  const detected = useInputCapability()
  const resolvedInput = input ?? detected
  const compact = rowLayout === 'compactDesktop'
  const isScheduling = addForToday?.endeavorId === card.id

  return (
    <div className="flex flex-col gap-2">
      <EndeavorRow
        endeavorId={card.id}
        symbol={card.symbol}
        title={card.title}
        badges={
          // Canon's `InboxRowWrapper`: urgency only when it is worth reading,
          // then the reward. Time info is off in both Inbox presets.
          card.urgency === 'low'
            ? [{ kind: 'reward', amount: card.reward }]
            : [
                { kind: 'urgency', urgency: card.urgency },
                { kind: 'reward', amount: card.reward },
              ]
        }
        config={inboxRowConfigFor(rowLayout)}
        now={now}
        locale={locale}
        capabilities={capabilities}
        onOperation={onOperation}
        input={input}
        trailing={
          <div
            className={cn(
              'relative z-2 flex shrink-0',
              compact ? 'items-center gap-1.5' : 'w-[130px] flex-col gap-1.5',
            )}
            style={{
              marginRight:
                resolvedInput === 'pointer' ? POINTER_ACTION_GUTTER_PX : 0,
            }}
            // A swipe never starts on an action button. Without this the row's
            // own `onPointerDown` calls `setPointerCapture`, and a captured
            // pointer retargets the subsequent `click` to the capturing element
            // — so in a real browser the tap lands on the row and canon's two
            // in-row buttons never fire at all. jsdom implements no pointer
            // capture, which is why only a browser could find this. Reported
            // against KC-IS-#14's lane with this PR.
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label={`Triage ${card.title}`}
              onClick={() => onTapTriage(card.id)}
              className={cn(
                'inline-flex items-center justify-center gap-1 rounded-kro-pill px-2.5',
                'font-semibold text-white text-xs',
                'outline-none focus-visible:shadow-[var(--kro-ring)]',
                compact ? 'h-7' : 'w-full py-1.5',
              )}
              style={{ backgroundColor: colorVar('badgeBlue') }}
            >
              <TriageGlyph size={11} aria-hidden />
              Triage
            </button>

            <button
              type="button"
              aria-label={`Add ${card.title} for today`}
              aria-expanded={isScheduling}
              onClick={() => onRequestAddForToday(card.id)}
              className={cn(
                'inline-flex items-center justify-center gap-1 rounded-kro-pill',
                'font-semibold text-xs',
                'outline-none focus-visible:shadow-[var(--kro-ring)]',
                compact ? 'size-7' : 'w-full px-2.5 py-1.5',
              )}
              style={{
                color: colorVar('badgeGreen'),
                backgroundColor: `color-mix(in srgb, ${colorVar('badgeGreen')} 15%, transparent)`,
              }}
            >
              {compact ? (
                <AddForTodayGlyph size={13} aria-hidden />
              ) : (
                'Add for Today'
              )}
            </button>
          </div>
        }
      />

      {isScheduling && addForToday !== null ? (
        <AddForTodayConfirm
          pickedTime={addForToday.pickedTime}
          locale={locale}
          onAdjust={onAdjustAddForTodayTime}
          onCancel={onCancelAddForToday}
          onConfirm={onConfirmAddForToday}
        />
      ) : null}
    </div>
  )
}

/**
 * Canon's `SchedulePopover`, expanded under its row.
 *
 * The time is restricted to today, exactly as canon's `dateInterval` is
 * (`startOfDay ... 23:59`): the input carries only a time-of-day, and the day
 * comes from the prefilled instant the slice computed, so there is no way to
 * name a slot outside today at all.
 */
function AddForTodayConfirm({
  pickedTime,
  locale,
  onAdjust,
  onCancel,
  onConfirm,
}: {
  readonly pickedTime: Date
  readonly locale?: string
  readonly onAdjust: (time: Date) => void
  readonly onCancel: () => void
  readonly onConfirm: () => void
}) {
  return (
    <div
      data-testid="add-for-today-confirm"
      role="group"
      aria-label="Add for Today"
      className="flex flex-col gap-3 p-3.5"
      style={{
        borderRadius: radiusVar('surface'),
        backgroundColor: colorVar('backInner'),
      }}
    >
      <p className="m-0 font-semibold text-base" style={{ color: colorVar('fore') }}>
        Add for Today
      </p>
      <Input
        type="time"
        aria-label="Time"
        data-testid="add-for-today-time"
        lang={locale}
        value={timeInputValue(pickedTime)}
        onChange={(event) => {
          const parsed = parseTimeInput(event.target.value, pickedTime)
          if (parsed !== null) onAdjust(parsed)
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Schedule
        </Button>
      </div>
    </div>
  )
}
