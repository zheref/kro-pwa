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

import { assertNever, defaultTriageDurationOptionsMinutes } from '@kro/core'
import { Hourglass } from 'lucide-react'
import {
  type MutableRefObject,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { EmojiPickerPopover } from '../../../design/chrome/emoji/EmojiPickerPopover'
import { PropertyPill } from '../../../design/hig/selection/PropertyPill'
import { Button, ShortcutHint } from '../../../design/system/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../design/system/primitives/dialog'
import { Input } from '../../../design/system/primitives/input'
import { SheetContent } from '../../../design/system/primitives/sheet'
import {
  colorVar,
  radiusVar,
  spacingVar,
  semanticVar,
  shadowVar,
} from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type {
  CaptureTimeEditOutcome,
  CaptureTimeField,
} from '../CaptureFeature'
import {
  type CaptureDestination,
  type CaptureDraft,
  CaptureBlocker,
  CaptureKind,
  type CaptureRecurrence,
  MAXIMUM_CAPTURE_REWARDS,
  MAXIMUM_CAPTURE_VALUE,
  MINIMUM_CAPTURE_REWARDS,
  captureDestinationGlyph,
  captureDestinationLabel,
  captureDurationLabel,
  captureKindDefaultRewards,
  type CaptureKindCapabilities,
  captureValueLabel,
  captureKindGlyph,
  captureKindLabel,
  captureKindPlaceholder,
  captureKindTint,
  captureKinds,
} from '../CaptureRules'
import { SegmentedControl } from '../../../design/hig/selection/SegmentedControl'
import {
  type ControlDensity,
  controlDensity,
} from '../../../design/system/density'
import { captureIcon, captureIconFor } from './captureIcons'
import {
  CaptureSuggestionsFragment,
  SUGGESTIONS_PANE_MIN_HEIGHT_PX,
} from './CaptureSuggestionsFragment'
import type { CaptureSuggestion } from '../CaptureSuggestions'
import {
  CAPTURE_PROMPT_CHORDS,
  type CapturePromptPanel,
  composeCaptureStatusLine,
  capturePromptKeyHint,
  resolveCapturePromptKey,
} from './capturePromptKeyboard'
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
/** Reward points — canon's `medal.star`, from the shared symbol map. */
const RewardGlyph = captureIcon('medal.star')
const CalendarGlyph = captureIcon('calendar')
const ClockGlyph = captureIcon('clock')
const ClockEndGlyph = captureIcon('clock.badge.checkmark')
const EmptyStar = captureIcon('star')
const SparklesGlyph = captureIcon('sparkles')
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

const NO_SUGGESTIONS: readonly CaptureSuggestion[] = []
/** The popover's `bottom-6` inset from the viewport's bottom edge. */
const PROMPT_POPOVER_BOTTOM_INSET_PX = 24
/** `--kro-space-medium` — the gap between the pane and the prompt. */
const SUGGESTIONS_PANE_GAP_PX = 16
/** `--kro-space-large` — the margin between the pane and the viewport's top. */
const SUGGESTIONS_PANE_TOP_MARGIN_PX = 24
const NO_SUGGESTION_IDS: readonly string[] = []

/** The status line's fixed height, per presentation (px). */
export const CAPTURE_STATUS_LINE_HEIGHT = { compact: 32, touch: 44 } as const

/** Which inline panel is expanded. Only one at a time, exactly as canon. */
type PromptPanel = CapturePromptPanel | null

/** The value when it is a finite number, else `null`. */
export const finiteOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** A duration in seconds as its chip label — canon's `formattedDuration`. */
export const durationChipLabel = (
  seconds: number | null | undefined,
): string => {
  const finite = finiteOrNull(seconds)
  return finite === null
    ? 'Duration'
    : captureDurationLabel(Math.max(1, Math.round(finite / 60)))
}

export interface CapturePromptFragmentProps {
  readonly isOpen: boolean
  readonly draft: CaptureDraft
  /** `prompt.startEdit !== null` — the slice owns the snapshot, not this view. */
  readonly isEditingStartTime: boolean
  readonly isEditingEndTime: boolean
  /** The hosts the current kind supports, among those available. */
  readonly availableDestinations: readonly CaptureDestination[]
  /** The title row's badge — the pick, else the computed symbol. */
  readonly resolvedSymbol: string
  /** The kind and the host together demand a value rating. */
  readonly isValueRequired: boolean
  readonly canSubmit: boolean
  /** The epic's a11y contract: a disabled Add names what blocks it. */
  readonly blockedReason: string | null
  /** The first unmet requirement — where plain Return walks to. */
  readonly blocker: CaptureBlocker | null
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
  /** `null` clears the rating. */
  readonly onPickValue: (value: number | null) => void
  /** Seconds; `null` clears the estimate. */
  readonly onPickDuration: (seconds: number | null) => void
  readonly onPickEmoji: (emoji: string) => void
  /**
   * The suggestions pane (web-only, `captureSuggestions`). Empty hides it;
   * it only ever shows on the desktop popover.
   */
  readonly suggestions?: readonly CaptureSuggestion[]
  readonly selectedSuggestionIds?: readonly string[]
  /** How many ticked suggestions **Add N** would write, events included. */
  readonly suggestionAddCount?: number
  /** A multi-add is being written — its Add is spent until it settles. */
  readonly isAddingSuggestions?: boolean
  readonly onPickSuggestion?: (suggestionId: string) => void
  readonly onToggleSuggestion?: (suggestionId: string) => void
  readonly onAddSuggestions?: () => void
  /** The pane may exist here (desktop popover, flag on) — shows the toggle. */
  readonly canToggleSuggestions?: boolean
  /** The remembered on/off choice for the pane. */
  readonly isSuggestionsShown?: boolean
  readonly onToggleSuggestions?: () => void
  readonly onPickRecurrence: (recurrence: CaptureRecurrence) => void
  readonly onSelectDestination: (destination: CaptureDestination) => void
  readonly onDiscard: () => void
  readonly onSubmit: () => void
  /**
   * The open inline panel — the panel half of the slice's one exclusive
   * editor (`UZF-9`). The time half arrives as `isEditing…Time`.
   */
  readonly openPanel: CapturePromptPanel | null
  /** Open a panel, or close it with `null`. */
  readonly onSetPanel: (panel: CapturePromptPanel | null) => void
  /** What the draft's kind can carry — a Selector's answer (`UZF-11`). */
  readonly capabilities: CaptureKindCapabilities
  /**
   * The web-only `keyboardAccelerators` flag: ⌥ chords, keycaps, key hints
   * and the Return-walk. Off, only Return-on-the-title adds.
   */
  readonly keyboardAccelerators: boolean
}

export function CapturePromptFragment(props: CapturePromptFragmentProps) {
  const {
    isOpen,
    draft,
    presentation,
    isEditingStartTime,
    isEditingEndTime,
    onDiscard,
    onEndTimeEdit,
    openPanel: panel,
    onSetPanel,
  } = props
  const isSheet = presentation === 'sheet'

  /**
   * Escape peels one layer at a time, innermost first (HIG layering; canon
   * defines no keyboard shortcuts of its own): an open host menu or inline
   * editor closes, an open time editor discards its edit, and only then does
   * Escape discard the whole prompt through the dialog's own dismissal.
   */
  /**
   * The form's key handler, registered here so it can listen on the WHOLE
   * dialog. Listening on the form alone missed every key pressed while focus
   * sat on the dialog itself — where a click on the pane's glass or the
   * dialog's own autofocus leaves it — so ⌥S never reached the suggestions
   * and the arrows fell through to scrolling.
   */
  const promptKeyHandler = useRef<
    ((event: ReactKeyboardEvent<HTMLDivElement>) => void) | null
  >(null)
  const onDialogKeyDownCapture = (event: ReactKeyboardEvent<HTMLDivElement>) =>
    promptKeyHandler.current?.(event)

  const onEscapeKeyDown = (event: KeyboardEvent) => {
    // Escape inside the suggestions returns to the title, not out of the prompt.
    const active = event.target instanceof Element ? event.target : null
    const content = active?.closest('[data-testid="capture-prompt"]')
    if (active?.closest('[data-testid="capture-suggestions"]') && content) {
      event.preventDefault()
      content
        .querySelector<HTMLInputElement>('[data-testid="capture-title"]')
        ?.focus()
      return
    }
    if (panel !== null) {
      event.preventDefault()
      onSetPanel(null)
      return
    }
    if (isEditingStartTime || isEditingEndTime) {
      event.preventDefault()
      if (isEditingStartTime) onEndTimeEdit('start', 'discard')
      if (isEditingEndTime) onEndTimeEdit('end', 'discard')
    }
  }

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
          onEscapeKeyDown={onEscapeKeyDown}
          onKeyDownCapture={onDialogKeyDownCapture}
        >
          {heading}
          <PromptForm {...props} keyHandlerRef={promptKeyHandler} />
        </SheetContent>
      ) : (
        <DialogContent
          hideClose
          data-testid="capture-prompt"
          data-kro-presentation="popover"
          onEscapeKeyDown={onEscapeKeyDown}
          onKeyDownCapture={onDialogKeyDownCapture}
          className={cn(
            'top-auto right-6 bottom-6 left-auto',
            'translate-x-0 translate-y-0',
            'flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-y-auto p-0',
            // The detail pane's own motion — slides in from the trailing edge
            // with a fade, out the same way (motion.css `kro-trailing-panel`;
            // Radix keeps it mounted through the exit animation).
            'kro-trailing-panel',
            // The suggestions pane floats above the panel; on a viewport tall
            // enough to show it the panel must not clip it.
            (props.suggestions?.length ?? 0) > 0 && 'overflow-visible',
          )}
          style={{
            // One fixed width for the prompt's whole life — it never resizes
            // in flight. Sized so a fresh draft's properties fit one line;
            // longer values wrap onto a second line instead of scrolling.
            width: `${CAPTURE_PROMPT_POPOVER_WIDTH}px`,
            // The floating panes' corner — `--kro-radius-panel` (12px), shared
            // with the suggestions pane and the band's bottom corners. Inline
            // so it beats `rounded-kro-surface` and `.kro-glass`'s default.
            borderRadius: radiusVar('panel'),
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
          <PromptForm {...props} keyHandlerRef={promptKeyHandler} />
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
  resolvedSymbol,
  isValueRequired,
  canSubmit,
  blockedReason,
  blocker,
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
  onPickValue,
  onPickDuration,
  onPickEmoji,
  suggestions = NO_SUGGESTIONS,
  selectedSuggestionIds = NO_SUGGESTION_IDS,
  suggestionAddCount = 0,
  onPickSuggestion,
  onToggleSuggestion,
  onAddSuggestions,
  canToggleSuggestions = false,
  isSuggestionsShown = false,
  onToggleSuggestions,
  onPickRecurrence,
  onSelectDestination,
  onDiscard,
  onSubmit,
  openPanel: panel,
  onSetPanel: setPanel,
  capabilities,
  isAddingSuggestions = false,
  keyboardAccelerators,
  keyHandlerRef,
}: CapturePromptFragmentProps & {
  /** Where this form hands the dialog its key handler. */
  readonly keyHandlerRef: MutableRefObject<
    ((event: ReactKeyboardEvent<HTMLDivElement>) => void) | null
  >
}) {
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
  const { earnsRewards, supportsValue, supportsDuration, isTimeClearable } =
    capabilities
  // A draft from before these fields existed (a long-lived tab across a hot
  // reload) can carry `undefined` here. Read them through a finite-number
  // guard so a chip falls back to canon's placeholder rather than "undefined"
  // or "NaN". State itself is not rewritten.
  const draftValue = finiteOrNull(draft.value)
  const draftDuration = finiteOrNull(draft.duration)
  const draftRewards =
    finiteOrNull(draft.rewards) ?? captureKindDefaultRewards(draft.kind)
  const isCompact = presentation === 'popover'
  /**
   * The web-only `keyboardAccelerators` flag, for what is SEEN: keycaps, chord
   * tooltips and key hints show only on the desktop popover with it on. Off,
   * the prompt behaves as it did before — Return on the title adds a ready
   * capture, and Escape (the dialog's own) discards.
   */
  const hints = isCompact && keyboardAccelerators
  const chordAria = (aria: string) => (keyboardAccelerators ? aria : undefined)
  // The suggestions pane is a desktop affordance: the phone sheet's height
  // is its content, so a pane above it has nowhere to go.
  const showsSuggestions = isCompact && suggestions.length > 0
  /** ⌥S opened the pane — focus its first card once it has rendered. */
  const [focusSuggestionsWhenShown, setFocusSuggestionsWhenShown] =
    useState(false)

  /**
   * The pane's presence, so hiding it animates out: `open` while shown,
   * `closed` while its exit animation runs (content kept, last cards
   * frozen), `gone` once that ends.
   */
  const [paneState, setPaneState] = useState<'open' | 'closed' | 'gone'>(
    showsSuggestions ? 'open' : 'gone',
  )
  useEffect(() => {
    if (!focusSuggestionsWhenShown || !showsSuggestions) return
    const card = formRef.current?.querySelector<HTMLElement>(
      '[data-kro-row-pick]',
    )
    if (card === null || card === undefined) return
    card.focus()
    setFocusSuggestionsWhenShown(false)
  })
  const lastSuggestions = useRef(suggestions)
  if (showsSuggestions) lastSuggestions.current = suggestions
  /**
   * Whether the pane moves on its own. While the prompt presents or dismisses,
   * the pane is part of it — it rides the prompt's transform and carries no
   * animation of its own, so the two travel as one piece. A second
   * `kro-trailing-in` inside the prompt's would compound the translate and
   * trail behind it. Only a toggle while the prompt stays open (the sparkles
   * button, ⌥S) gives the pane its own trailing motion.
   */
  const [paneMovesAlone, setPaneMovesAlone] = useState(false)
  // The user's toggle is the only thing that frees it: suggestions arriving
  // a tick after mount are still part of the prompt's own presentation.
  const toggleSuggestions = () => {
    setPaneMovesAlone(true)
    onToggleSuggestions?.()
  }
  useLayoutEffect(() => {
    if (showsSuggestions) {
      setPaneState('open')
      return
    }
    setPaneState((current) => (current === 'gone' ? 'gone' : 'closed'))
    const fallback = setTimeout(() => setPaneState('gone'), 400)
    return () => clearTimeout(fallback)
  }, [showsSuggestions])

  /**
   * The pane's height: everything between the prompt's top edge and the top
   * of the viewport, less a medium gap above the prompt, a large margin
   * below the viewport's top and the popover's own bottom inset. `null`
   * hides the pane — too little room for two rows is no room at all.
   */
  const formRef = useRef<HTMLDivElement | null>(null)
  const [suggestionsPaneHeight, setSuggestionsPaneHeight] = useState<
    number | null
  >(null)
  // Layout, not passive: the height lands before the prompt's first paint, so
  // a pane shown by preference is there on frame one rather than flashing in.
  useLayoutEffect(() => {
    if (!showsSuggestions) return
    const measure = () => {
      // The popover is pinned `bottom-6` (24px), so the prompt's top edge
      // sits at the viewport height less that inset and the prompt's height.
      const promptHeight = formRef.current?.offsetHeight ?? 0
      const available =
        window.innerHeight -
        PROMPT_POPOVER_BOTTOM_INSET_PX -
        promptHeight -
        SUGGESTIONS_PANE_GAP_PX -
        SUGGESTIONS_PANE_TOP_MARGIN_PX
      setSuggestionsPaneHeight(
        available >= SUGGESTIONS_PANE_MIN_HEIGHT_PX ? available : null,
      )
    }
    measure()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (formRef.current !== null) observer?.observe(formRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [showsSuggestions])

  const density = controlDensity(!isCompact)
  /** Canon closes any open editor when another one expands. */
  const closeOpenTimeEditors = () => {
    // `done`, not `discard`: the value the user landed on is kept, which is
    // what `isShowingTimePicker = false` does on the Swift side.
    if (isEditingStartTime) onEndTimeEdit('start', 'done')
    if (isEditingEndTime) onEndTimeEdit('end', 'done')
  }

  const togglePanel = (next: Exclude<PromptPanel, null>) => {
    setPanel(panel === next ? null : next)
    closeOpenTimeEditors()
  }

  /** Which panel's first field a keyboard chord should focus once it opens. */
  const [keyboardFocus, setKeyboardFocus] = useState<
    'date' | CaptureTimeField | null
  >(null)
  const [isEmojiOpen, setEmojiOpen] = useState(false)
  const focusTitle = () => titleRef.current?.focus()

  /**
   * The keyboard map (`capturePromptKeyboard.ts`), performed. Capture phase,
   * so a focused pill, star or preset never turns Return into its own click:
   * Return is Add from anywhere, or Done inside a time panel.
   */
  const onPromptKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null
    // React bubbles portal events through the React tree, so the emoji
    // picker's keys arrive here too. Its Return picks an emoji; leave it be.
    if (target === null || !event.currentTarget.contains(target)) return
    if (!keyboardAccelerators) {
      // Flag off: only the status quo — plain Return on the title adds a
      // capture that is ready. No chords, no Return-walk, no grid keys.
      if (
        event.key === 'Enter' &&
        target === titleRef.current &&
        !event.nativeEvent.isComposing &&
        !event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        canSubmit
      ) {
        event.preventDefault()
        onSubmit()
      }
      return
    }
    // Return on a focused suggestion card picks it into the prompt and hands
    // focus to the title; the NEXT Return is the prompt's own (Add or walk).
    const card = target.closest<HTMLElement>('[data-kro-row-pick]')
    if (
      card !== null &&
      event.key === 'Enter' &&
      !event.nativeEvent.isComposing &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault()
      event.stopPropagation()
      onPickSuggestion?.(card.dataset.kroRowPick ?? '')
      focusTitle()
      return
    }
    const timePanel = target?.closest<HTMLElement>('[data-kro-time-field]')
    const intent = resolveCapturePromptKey(
      {
        key: event.key,
        code: event.code,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        isComposing: event.nativeEvent.isComposing,
      },
      {
        openPanel: panel,
        timePanelInFocus:
          (timePanel?.dataset.kroTimeField as CaptureTimeField | undefined) ??
          null,
        isEvent,
        isHabit,
        earnsRewards,
        supportsValue,
        supportsDuration,
        hasSuggestions: showsSuggestions || (isCompact && canToggleSuggestions),
      },
    )
    if (intent === null) return
    event.preventDefault()
    event.stopPropagation()

    switch (intent.kind) {
      case 'submit':
        // Submittable → Add. Otherwise walk to the next unmet requirement;
        // nothing submits, and the live reason stays announced.
        if (canSubmit) onSubmit()
        else if (blocker !== null) walkTo(blocker)
        return
      case 'confirmTime':
        onEndTimeEdit(intent.field, 'done')
        focusTitle()
        return
      case 'selectKind':
        setPanel(null)
        onSelectKind(intent.captureKind)
        focusTitle()
        return
      case 'togglePanel':
        setKeyboardFocus(intent.panel === 'date' ? 'date' : null)
        togglePanel(intent.panel)
        if (intent.panel !== 'date') focusTitle()
        return
      case 'toggleTime':
        setKeyboardFocus(intent.field)
        toggleTimeEdit(intent.field)
        return
      case 'openEmoji':
        setPanel(null)
        setEmojiOpen(true)
        return
      case 'stepRewards':
        onPickRewards(
          intent.direction === 1
            ? draftRewards + captureRewardStep(draftRewards)
            : draftRewards - captureRewardStep(draftRewards),
        )
        return
      case 'pickNth':
        pickNth(intent.index)
        return
      case 'toggleSuggestionFocus': {
        const root = event.currentTarget
        const inRow = target.closest('[data-testid="capture-suggestions"]')
        if (inRow !== null) {
          focusTitle()
          return
        }
        setPanel(null)
        // ⌥S on a hidden pane opens it, then lands in it once it mounts.
        if (!showsSuggestions) {
          toggleSuggestions()
          setFocusSuggestionsWhenShown(true)
          return
        }
        const selected = selectedSuggestionIds[0]
        const card =
          (selected === undefined
            ? null
            : root.querySelector<HTMLElement>(
                `[data-kro-row-pick="${selected}"]`,
              )) ?? root.querySelector<HTMLElement>('[data-kro-row-pick]')
        card?.focus()
        return
      }
      case 'addSelectedSuggestions':
        if (suggestionAddCount > 0) onAddSuggestions?.()
        return
      default:
        assertNever(intent)
    }
  }

  // The dialog forwards every key to this handler (see `promptKeyHandler`).
  keyHandlerRef.current = onPromptKeyDown

  /**
   * Return on a blocked draft: open (and focus) the editor of the first unmet
   * requirement, in `captureBlocker`'s canon order. Optional fields are never
   * visited.
   */
  const walkTo = (next: CaptureBlocker) => {
    const openTime = (field: CaptureTimeField) => {
      const isEditing =
        field === 'start' ? isEditingStartTime : isEditingEndTime
      setKeyboardFocus(field)
      if (isEditing) return
      setPanel(null)
      closeOpenTimeEditors()
      onBeginTimeEdit(field)
    }
    const openList = (target: 'value' | 'repeat') => {
      closeOpenTimeEditors()
      setPanel(target)
      focusTitle()
    }
    switch (next) {
      case CaptureBlocker.missingTitle:
        setPanel(null)
        focusTitle()
        return
      case CaptureBlocker.missingEventStartAndEnd:
      case CaptureBlocker.missingEventStart:
      case CaptureBlocker.missingHabitTime:
        openTime('start')
        return
      case CaptureBlocker.missingEventEnd:
        openTime('end')
        return
      case CaptureBlocker.missingHabitRecurrence:
        openList('repeat')
        return
      case CaptureBlocker.missingValue:
        openList('value')
        return
      default:
        assertNever(next)
    }
  }

  /**
   * Held-to-reveal: the chord hints show only while Option/Alt is down, the
   * way macOS menus reveal shortcuts, and never on the touch sheet. The hints'
   * space is always reserved, so revealing them never reflows the row.
   */
  const [isOptionHeld, setOptionHeld] = useState(false)
  /**
   * Keyboard modality, simply: the last input was a key press, not a pointer.
   * It decides whether the status line also says what to press next.
   */
  const [isKeyboardDriven, setKeyboardDriven] = useState(false)
  useEffect(() => {
    if (!hints) return
    const onKeyDown = (event: KeyboardEvent) => {
      setOptionHeld(event.altKey)
      setKeyboardDriven(true)
    }
    const onKeyUp = (event: KeyboardEvent) => setOptionHeld(event.altKey)
    const release = () => setOptionHeld(false)
    const onPointerDown = () => setKeyboardDriven(false)
    // Capture phase: the form's own key handler stops Return and the ⌥
    // chords from bubbling, so a bubbling listener here would never learn
    // that the user is on the keyboard — or that Option went up.
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', release)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', release)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [hints])

  const hintFor = (glyph: string) => (hints ? glyph : undefined)

  /** A digit in an open list editor: the nth option, then back to the title. */
  const pickNth = (index: number) => {
    switch (panel) {
      case 'value':
        if (index < MAXIMUM_CAPTURE_VALUE) onPickValue(index + 1)
        break
      case 'duration': {
        const minutes = defaultTriageDurationOptionsMinutes[index]
        if (minutes !== undefined) onPickDuration(minutes * 60)
        break
      }
      case 'repeat': {
        const preset = captureRecurrencePresets(draft.date)[index]
        if (preset !== undefined) onPickRecurrence(preset.recurrence)
        break
      }
      case 'destination': {
        const destination = availableDestinations[index]
        if (destination !== undefined) onSelectDestination(destination)
        break
      }
      default:
        return
    }
    setPanel(null)
    focusTitle()
  }

  const keyHint = capturePromptKeyHint(
    panel,
    isEditingStartTime || isEditingEndTime,
    panel === 'duration'
      ? defaultTriageDurationOptionsMinutes.length
      : panel === 'repeat'
        ? captureRecurrencePresets(draft.date).length
        : availableDestinations.length,
    canSubmit,
  )
  const statusLine = composeCaptureStatusLine({
    reason: blockedReason,
    isKeyboardDriven: hints && isKeyboardDriven,
    editorKeys: keyHint,
    canSubmit,
  })

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
      ref={formRef}
      className="relative flex flex-col"
      data-slot="capture-prompt-form"
      data-kro-density={isCompact ? 'compact' : 'touch'}
    >
      {paneState !== 'gone' && suggestionsPaneHeight !== null ? (
        // Floated above the prompt at its exact width, a medium gap above it,
        // filling the height up to a large margin below the viewport's top.
        // The detail pane's trailing-edge motion, in and out.
        <div
          data-slot="capture-suggestions-pane"
          data-state={paneState}
          inert={paneState === 'closed' ? true : undefined}
          onAnimationEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              paneState === 'closed'
            ) {
              setPaneState('gone')
            }
          }}
          data-kro-pane-motion={paneMovesAlone ? 'own' : 'embedded'}
          className={cn(
            'absolute right-0 bottom-full left-0',
            paneMovesAlone && 'kro-trailing-panel',
          )}
          style={{
            marginBottom: spacingVar('medium'),
            height: `${suggestionsPaneHeight}px`,
          }}
        >
          <CaptureSuggestionsFragment
            suggestions={lastSuggestions.current}
            selectedIds={selectedSuggestionIds}
            addCount={suggestionAddCount}
            isAdding={isAddingSuggestions}
            revealChord={isOptionHeld}
            now={now}
            onPick={(id) => {
              onPickSuggestion?.(id)
              focusTitle()
            }}
            onToggle={(id) => onToggleSuggestion?.(id)}
            onAddSelected={() => onAddSuggestions?.()}
          />
        </div>
      ) : null}
      {/* ── Kind picker ─────────────────────────────────────────────── */}
      {/* The design system's segmented control — the same one the session
          sheet's Pomodoro / Stopwatch toggle uses. */}
      <div
        className={cn(
          'relative flex justify-center px-3',
          isCompact ? 'pt-2 pb-2' : 'pt-4 pb-3',
        )}
      >
        {isCompact && canToggleSuggestions ? (
          // Pinned to the far left; the segmented control stays centred.
          <button
            type="button"
            data-testid="capture-suggestions-toggle"
            aria-label="Suggestions"
            aria-pressed={isSuggestionsShown}
            aria-keyshortcuts={chordAria(
              CAPTURE_PROMPT_CHORDS.suggestions.aria,
            )}
            title={`${isSuggestionsShown ? 'Hide' : 'Show'} suggestions${hints ? ` (${CAPTURE_PROMPT_CHORDS.suggestions.glyph})` : ''}`}
            onClick={toggleSuggestions}
            className="kro-motion-quick absolute top-1/2 left-3 inline-flex -translate-y-1/2 items-center justify-center rounded-kro-small outline-none hover:bg-[color-mix(in_srgb,var(--kro-color-fore)_8%,transparent)] focus-visible:shadow-[var(--kro-ring-field)]"
            style={{
              width: 28,
              height: 28,
              color: isSuggestionsShown
                ? colorVar('accent')
                : colorVar('foreSecondary'),
              backgroundColor: isSuggestionsShown
                ? `color-mix(in srgb, ${colorVar('accent')} 14%, transparent)`
                : undefined,
            }}
          >
            {hints ? (
              <ShortcutHint placement="keycap" reveal={isOptionHeld}>
                {CAPTURE_PROMPT_CHORDS.suggestions.glyph}
              </ShortcutHint>
            ) : null}
            <SparklesGlyph size={14} aria-hidden />
          </button>
        ) : null}
        <SegmentedControl
          label="Kind"
          options={captureKinds.map((kind) => {
            const Glyph = captureIconFor(captureKindGlyph(kind))
            const position = captureKinds.indexOf(kind) + 1
            return {
              value: kind,
              label: captureKindLabel(kind),
              keyShortcuts: keyboardAccelerators
                ? `Alt+${position}`
                : undefined,
              shortcutHint: hints ? `⌥${position}` : undefined,
              // Canon's KindChip: the glyph carries the kind's tint at rest,
              // the label stays neutral, and the selected segment takes the
              // tint as its fill.
              icon: (
                <Glyph
                  size={isCompact ? 11 : 13}
                  aria-hidden
                  style={
                    kind === draft.kind
                      ? undefined
                      : { color: semanticVar(captureKindTint(kind)) }
                  }
                />
              ),
            }
          })}
          value={draft.kind}
          density={density}
          selectionTint={semanticVar(captureKindTint(draft.kind))}
          revealShortcutHints={isOptionHeld}
          onChange={(kind) => {
            setPanel(null)
            onSelectKind(kind)
          }}
        />
      </div>

      <Separator />

      {/* ── Title row: [symbol] [title] [rewards] ─────────────────── */}
      <div
        className={cn(
          'flex items-center gap-2.5',
          isCompact ? 'px-3 py-1.5' : 'px-3 py-2.5',
        )}
      >
        <EmojiPickerPopover
          side="top"
          selection={resolvedSymbol}
          open={isEmojiOpen}
          onOpenChange={setEmojiOpen}
          onPick={(emoji) => {
            onPickEmoji(emoji)
            // Radix hands focus back to the badge on close; typing continues
            // in the title instead.
            requestAnimationFrame(focusTitle)
          }}
          // After a pick (or Escape) typing continues in the title, not on
          // the badge.
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            focusTitle()
          }}
        >
          <button
            type="button"
            data-testid="capture-symbol"
            aria-label={`Symbol: ${resolvedSymbol}`}
            aria-keyshortcuts={chordAria(CAPTURE_PROMPT_CHORDS.emoji.aria)}
            title={
              hints
                ? `Symbol (${CAPTURE_PROMPT_CHORDS.emoji.glyph})`
                : undefined
            }
            // A fixed 34px square keeps the field from shifting sideways as
            // the resolved emoji changes width. Flat: the emoji IS the
            // affordance, exactly as canon's `emojiBadge`.
            className="relative inline-flex shrink-0 items-center justify-center rounded-kro-small outline-none focus-visible:shadow-[var(--kro-ring-field)]"
            style={{ width: 34, height: 34, fontSize: 20, lineHeight: 1 }}
          >
            {resolvedSymbol}
            {hints ? (
              <ShortcutHint placement="keycap" reveal={isOptionHeld}>
                {CAPTURE_PROMPT_CHORDS.emoji.glyph}
              </ShortcutHint>
            ) : null}
          </button>
        </EmojiPickerPopover>

        <input
          ref={titleRef}
          data-testid="capture-title"
          aria-label="Title"
          className={cn(
            'min-w-0 flex-1 bg-transparent outline-none',
            isCompact ? 'py-1 text-sm' : 'py-2 text-base',
            'placeholder:text-kro-fore-secondary',
          )}
          style={{ color: colorVar('fore') }}
          placeholder={captureKindPlaceholder(draft.kind)}
          value={draft.title}
          onChange={(event) => onEditTitle(event.target.value)}
          // Return (Add) is handled for the whole form in `onPromptKeyDown`.
        />

        {earnsRewards ? (
          <PropertyPill
            density={density}
            glyph={
              <RewardGlyph
                size={12}
                aria-hidden
                style={{
                  color:
                    panel === 'rewards' ? undefined : colorVar('rewardYellow'),
                }}
              />
            }
            label={String(draftRewards)}
            isSet
            isExpanded={panel === 'rewards'}
            accessibilityLabel={`Rewards: ${draftRewards} points`}
            onSelect={() => togglePanel('rewards')}
            keyShortcuts={chordAria(CAPTURE_PROMPT_CHORDS.rewards.aria)}
            shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.rewards.glyph)}
            revealShortcutHint={isOptionHeld}
            tooltip={
              hints
                ? `Rewards (${CAPTURE_PROMPT_CHORDS.rewards.glyph})`
                : undefined
            }
          />
        ) : null}
      </div>

      <Separator />

      {/* ── Date / time row ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col',
          isCompact ? 'gap-1.5 py-1.5' : 'gap-2 py-2.5',
        )}
      >
        {/* One line, never scrolled. The popover is sized to hold every
            kind's pills at their widest (labels are capped), so it never
            wraps; the phone sheet cannot widen past the screen, so there —
            and only there — the pills wrap. */}
        <div
          data-slot="capture-prompt-properties"
          className={cn(
            'flex gap-2 px-3',
            isCompact ? 'flex-nowrap' : 'flex-wrap',
          )}
        >
          {supportsValue ? (
            <PropertyPill
              density={density}
              glyph={
                <Star
                  size={12}
                  aria-hidden
                  style={{
                    color:
                      panel === 'value'
                        ? undefined
                        : isValueRequired && draftValue === null
                          ? colorVar('badgeOrange')
                          : colorVar('rewardYellow'),
                  }}
                />
              }
              label={draftValue === null ? 'Value' : String(draftValue)}
              isSet={draftValue !== null}
              isExpanded={panel === 'value'}
              accessibilityLabel={
                draftValue !== null
                  ? `Value: ${draftValue} of ${MAXIMUM_CAPTURE_VALUE}`
                  : isValueRequired
                    ? 'Value, required, not set'
                    : 'Value, not set'
              }
              onSelect={() => togglePanel('value')}
              keyShortcuts={chordAria(CAPTURE_PROMPT_CHORDS.value.aria)}
              shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.value.glyph)}
              revealShortcutHint={isOptionHeld}
              tooltip={
                hints
                  ? `Value (${CAPTURE_PROMPT_CHORDS.value.glyph})`
                  : undefined
              }
              onClear={
                draftValue === null ? undefined : () => onPickValue(null)
              }
              clearLabel="Clear value"
            />
          ) : null}

          {supportsDuration ? (
            <PropertyPill
              density={density}
              glyph={<Hourglass size={12} aria-hidden />}
              label={durationChipLabel(draftDuration)}
              isSet={draftDuration !== null}
              isExpanded={panel === 'duration'}
              accessibilityLabel={
                draftDuration === null
                  ? 'Duration, not set'
                  : `Duration: ${durationChipLabel(draftDuration)}`
              }
              onSelect={() => togglePanel('duration')}
              keyShortcuts={chordAria(CAPTURE_PROMPT_CHORDS.duration.aria)}
              shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.duration.glyph)}
              revealShortcutHint={isOptionHeld}
              tooltip={
                hints
                  ? `Duration (${CAPTURE_PROMPT_CHORDS.duration.glyph})`
                  : undefined
              }
              onClear={
                draftDuration === null ? undefined : () => onPickDuration(null)
              }
              clearLabel="Clear duration"
            />
          ) : null}

          {isHabit ? null : (
            <PropertyPill
              density={density}
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
              keyShortcuts={chordAria(CAPTURE_PROMPT_CHORDS.date.aria)}
              shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.date.glyph)}
              revealShortcutHint={isOptionHeld}
              tooltip={
                hints ? `Date (${CAPTURE_PROMPT_CHORDS.date.glyph})` : undefined
              }
              // Never offered for an Event — `Endeavor.event(...)` has no way
              // to represent one without a start, and `withDateCleared`
              // enforces the same invariant at the state layer (`KC-IS-#75`).
              onClear={!isEvent && draft.hasDate ? onClearDate : undefined}
              clearLabel="Clear date"
            />
          )}

          <PropertyPill
            density={density}
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
            keyShortcuts={chordAria(CAPTURE_PROMPT_CHORDS.time.aria)}
            shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.time.glyph)}
            revealShortcutHint={isOptionHeld}
            tooltip={
              hints ? `Time (${CAPTURE_PROMPT_CHORDS.time.glyph})` : undefined
            }
            // An event's start is cleared from its panel; a habit's time is
            // required and never clearable (`requiresTime`).
            onClear={
              !isEvent && isTimeClearable && draft.hasTime
                ? () => onEndTimeEdit('start', 'clear')
                : undefined
            }
            clearLabel="Clear time"
          />

          {isEvent ? (
            <PropertyPill
              density={density}
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
              keyShortcuts={chordAria(CAPTURE_PROMPT_CHORDS.end.aria)}
              shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.end.glyph)}
              revealShortcutHint={isOptionHeld}
              tooltip={
                hints
                  ? `End time (${CAPTURE_PROMPT_CHORDS.end.glyph})`
                  : undefined
              }
              onClear={
                draft.hasEndTime
                  ? () => onEndTimeEdit('end', 'clear')
                  : undefined
              }
              clearLabel="Clear end time"
            />
          ) : null}

          <PropertyPill
            density={density}
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
            keyShortcuts={chordAria(CAPTURE_PROMPT_CHORDS.repeat.aria)}
            shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.repeat.glyph)}
            revealShortcutHint={isOptionHeld}
            tooltip={
              hints
                ? `Repeat (${CAPTURE_PROMPT_CHORDS.repeat.glyph})`
                : undefined
            }
          />
        </div>

        <InlinePanel open={panel === 'value' && supportsValue}>
          <ValueEditor
            value={draftValue}
            isCompact={isCompact}
            onPick={onPickValue}
          />
        </InlinePanel>

        <InlinePanel open={panel === 'duration' && supportsDuration}>
          <DurationEditor
            seconds={draftDuration}
            density={density}
            isCompact={isCompact}
            onPick={onPickDuration}
          />
        </InlinePanel>

        <InlinePanel
          open={panel === 'date' && !isHabit}
          autoFocus={keyboardFocus === 'date'}
        >
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
        </InlinePanel>

        <InlinePanel
          open={isEditingStartTime}
          autoFocus={keyboardFocus === 'start'}
        >
          <TimePanel
            field="start"
            label={isEvent ? 'Start time' : 'Time'}
            value={draft.time}
            day={draft.date}
            canClear={isTimeClearable}
            onPick={onPickTime}
            onEnd={onEndTimeEdit}
          />
        </InlinePanel>

        <InlinePanel
          open={isEditingEndTime && isEvent}
          autoFocus={keyboardFocus === 'end'}
        >
          <TimePanel
            field="end"
            label="End time"
            value={draft.endTime}
            day={draft.date}
            canClear
            onPick={onPickTime}
            onEnd={onEndTimeEdit}
          />
        </InlinePanel>

        <InlinePanel open={panel === 'rewards' && earnsRewards}>
          <RewardsEditor
            points={draftRewards}
            isCompact={isCompact}
            onPick={onPickRewards}
          />
        </InlinePanel>

        <InlinePanel open={panel === 'repeat'}>
          <div
            className="flex flex-wrap gap-2 px-3 py-1"
            role="group"
            aria-label="Repeat"
            data-testid="capture-repeat-panel"
          >
            {captureRecurrencePresets(draft.date).map((preset) => (
              <PropertyPill
                key={preset.id}
                density={density}
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
        </InlinePanel>
      </div>

      <Separator />

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      {/* The actions row and the status line share one band: the prompt's
          own glass material, tinted toward black so it reads recessed. */}
      <div
        data-slot="capture-prompt-status-bar"
        className="kro-glass kro-glass--tinted flex flex-col text-xs"
        style={{
          // The band's bottom corners follow the prompt's own radius, so the
          // dark glass never squares off the rounded container (the popover
          // no longer clips its children — the suggestions pane floats out
          // of it). The sheet has square bottom corners, so nothing there.
          borderRadius: isCompact
            ? `0 0 ${radiusVar('panel')} ${radiusVar('panel')}`
            : 0,
          ['--kro-glass-tint' as string]: 'black',
        }}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-2 px-3',
            isCompact ? 'py-2' : 'py-3',
          )}
        >
          <DestinationPicker
            selected={draft.destination}
            available={availableDestinations}
            isExpanded={panel === 'destination'}
            isCompact={isCompact}
            hasChords={keyboardAccelerators}
            shortcutHint={hintFor(CAPTURE_PROMPT_CHORDS.host.glyph)}
            revealShortcutHint={isOptionHeld}
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
              className="min-w-24 px-3"
              shortcut="escape"
              showShortcut={hints}
              aria-label={`Discard new ${captureKindLabel(draft.kind).toLowerCase()}`}
              onClick={onDiscard}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size={isCompact ? 'sm' : 'pill'}
              className="min-w-24 px-3"
              data-testid="capture-add"
              shortcut="return"
              showShortcut={hints}
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

        {/* The divider between the actions row and the status line. */}
        <div
          aria-hidden
          className="h-px shrink-0"
          style={{ backgroundColor: colorVar('hairline') }}
        />

        <div
          data-slot="capture-status-line"
          className="flex items-center justify-center overflow-hidden px-3"
          // A FIXED height — identical with and without a reason, and for any
          // reason length — so the band never grows under the user's eye.
          style={{
            height: `${CAPTURE_STATUS_LINE_HEIGHT[isCompact ? 'compact' : 'touch']}px`,
          }}
        >
          {/* What the eye reads: the reason, then — keyboard-driven on the
              desktop — what to press next. The reason shrinks first, so a
              long one loses its tail before the keys do. Visual only. */}
          <p
            aria-hidden
            data-testid="capture-status-text"
            title={blockedReason ?? undefined}
            className="m-0 flex min-w-0 max-w-full items-center justify-center gap-1.5 text-xs"
            style={{ color: colorVar('foreSecondary') }}
          >
            {statusLine.reason === null ? null : (
              <span className="min-w-0 truncate">{statusLine.reason}</span>
            )}
            {statusLine.keys === null ? null : (
              <span data-testid="capture-key-hint" className="shrink-0">
                {statusLine.reason === null ? '' : '· '}
                {statusLine.keys}
              </span>
            )}
          </p>
          {/*
            The live region carries the reason ONLY — never the key hints —
            and is always mounted, so a screen reader hears the reason CHANGE
            (untitled -> event missing a start), not only its arrival.
          */}
          <p
            id="capture-blocked-reason"
            data-testid="capture-blocked-reason"
            aria-live="polite"
            className="sr-only"
          >
            {blockedReason ?? ''}
          </p>
        </div>
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

/** Canon's inline `timePickerPanel` — the value, then Discard / Clear / Done. */
function TimePanel({
  field,
  label,
  value,
  day,
  canClear,
  onPick,
  onEnd,
}: {
  readonly field: CaptureTimeField
  readonly label: string
  readonly value: Date
  readonly day: Date
  readonly canClear: boolean
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
      // Return inside this panel is its Done (`onPromptKeyDown` reads this).
      data-kro-time-field={field}
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
        {canClear ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEnd(field, 'clear')}
          >
            Clear
          </Button>
        ) : null}
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
      <RewardGlyph
        size={14}
        aria-hidden
        style={{ color: colorVar('rewardYellow') }}
      />
    </div>
  )
}

/**
 * One inline editor under the property row, expanding and collapsing with a
 * height + opacity transition on the design system's motion tokens.
 *
 * The height animates with the `grid-template-rows: 0fr → 1fr` technique, so
 * no measurement is needed. Collapsing animates too: the last content stays
 * mounted — `inert` and hidden from assistive tech — until the transition ends
 * (with a timeout fallback for environments that never fire `transitionend`).
 * Reduced motion needs nothing here: `motion.css` collapses the duration
 * tokens to ~0 under `prefers-reduced-motion`.
 */
function InlinePanel({
  open,
  autoFocus = false,
  children,
}: {
  readonly open: boolean
  /** Focus the panel's first field once it mounts — a keyboard chord opened it. */
  readonly autoFocus?: boolean
  readonly children?: ReactNode
}) {
  const [isMounted, setMounted] = useState(open)
  const [isShown, setShown] = useState(open)
  const ref = useRef<HTMLDivElement | null>(null)
  const lastChildren = useRef<ReactNode>(children)
  if (open) lastChildren.current = children

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    setShown(false)
    const fallback = setTimeout(
      () => setMounted(false),
      INLINE_PANEL_FALLBACK_MS,
    )
    return () => clearTimeout(fallback)
  }, [open])

  // The closed (0fr, transparent) frame must be *computed* before the flip to
  // open, or the browser coalesces both and there is nothing to animate from.
  // Reading layout forces that style pass; the flip then waits a frame.
  useLayoutEffect(() => {
    if (!open || !isMounted || isShown) return
    void ref.current?.offsetHeight
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [open, isMounted, isShown])

  useLayoutEffect(() => {
    if (!open || !isMounted || !autoFocus) return
    ref.current?.querySelector<HTMLElement>('input, button')?.focus()
  }, [open, isMounted, autoFocus])

  if (!isMounted) return null
  return (
    <div
      ref={ref}
      data-slot="capture-inline-panel"
      data-state={isShown ? 'open' : 'closed'}
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && !open) setMounted(false)
      }}
      style={{
        display: 'grid',
        gridTemplateRows: isShown ? '1fr' : '0fr',
        opacity: isShown ? 1 : 0,
        transitionProperty: 'grid-template-rows, opacity',
        // The token (240ms) collapses to ~0 under prefers-reduced-motion.
        transitionDuration: 'var(--kro-duration-standard, 240ms)',
        transitionTimingFunction: isShown ? PANEL_EASE_OUT : PANEL_EASE_IN,
      }}
    >
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        {lastChildren.current}
      </div>
    </div>
  )
}

/** Presenting decelerates in (the design system's `--kro-ease-out`). */
export const PANEL_EASE_OUT =
  'var(--kro-ease-out, cubic-bezier(0.22, 1, 0.36, 1))'
/**
 * Hiding accelerates out. The motion tokens have no ease-in, so this is the
 * standard Material/Apple "accelerate" curve, stated here.
 */
export const PANEL_EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)'
/** Unmount a closing panel even where `transitionend` never fires. */
const INLINE_PANEL_FALLBACK_MS = 400

/**
 * Canon's inline `valueEditor` — five stars, the selected rating's descriptor
 * under them. A required-but-unset rating is announced by the prompt's one
 * status line (and the chip's orange glyph), not here. Tapping
 * the selected star clears it, the same toggle Triage's rating rows use.
 */
function ValueEditor({
  value,
  isCompact,
  onPick,
}: {
  readonly value: number | null
  readonly isCompact: boolean
  readonly onPick: (value: number | null) => void
}) {
  const steps = Array.from({ length: MAXIMUM_CAPTURE_VALUE }, (_, i) => i + 1)
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-1"
      data-testid="capture-value-editor"
    >
      <div className="flex items-center gap-3">
        <span
          className={isCompact ? 'text-xs' : 'text-sm'}
          style={{ color: colorVar('foreSecondary') }}
        >
          Value to my life / goals
        </span>
        <span className="flex-1" />
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex" role="group" aria-label="Value">
            {steps.map((step) => {
              const isFilled = (value ?? 0) >= step
              const Glyph = isFilled ? Star : EmptyStar
              return (
                <button
                  key={step}
                  type="button"
                  aria-label={`${captureValueLabel(step) ?? ''}, level ${step}`}
                  aria-pressed={value === step}
                  onClick={() => onPick(value === step ? null : step)}
                  className="inline-flex items-center justify-center rounded-kro-small outline-none focus-visible:shadow-[var(--kro-ring-field)]"
                  style={{
                    width: 26,
                    height: 28,
                    color: isFilled
                      ? colorVar('rewardYellow')
                      : colorVar('foreSecondary'),
                  }}
                >
                  <Glyph
                    size={15}
                    aria-hidden
                    fill={isFilled ? 'currentColor' : 'none'}
                  />
                </button>
              )
            })}
          </div>
          {/* Reserved whether or not a rating is set, so picking one does
              not shift the stars. */}
          <span
            aria-hidden
            className="text-[10px]"
            style={{ color: colorVar('foreSecondary') }}
          >
            {value === null ? '\u00a0' : (captureValueLabel(value) ?? '\u00a0')}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Canon's inline `durationEditor` — Triage's preset lengths as pills. Tapping
 * the selected one clears it; the estimate never gates Add.
 */
function DurationEditor({
  seconds,
  density,
  isCompact,
  onPick,
}: {
  readonly seconds: number | null
  readonly density: ControlDensity
  readonly isCompact: boolean
  readonly onPick: (seconds: number | null) => void
}) {
  return (
    <div
      className="flex flex-col gap-2 py-1"
      data-testid="capture-duration-editor"
    >
      <span
        className={cn('px-3', isCompact ? 'text-xs' : 'text-sm')}
        style={{ color: colorVar('foreSecondary') }}
      >
        How long will it take?
      </span>
      <div
        className="flex flex-wrap gap-2 px-3"
        role="group"
        aria-label="Duration"
      >
        {defaultTriageDurationOptionsMinutes.map((minutes) => {
          const optionSeconds = minutes * 60
          const isSelected = seconds === optionSeconds
          return (
            <PropertyPill
              key={minutes}
              density={density}
              label={captureDurationLabel(minutes)}
              isSet={isSelected}
              isExpanded={isSelected}
              accessibilityLabel={captureDurationLabel(minutes)}
              onSelect={() => onPick(isSelected ? null : optionSeconds)}
            />
          )
        })}
      </div>
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
  hasChords,
  shortcutHint,
  revealShortcutHint,
  onToggle,
  onSelect,
}: {
  readonly selected: CaptureDestination
  readonly available: readonly CaptureDestination[]
  readonly isExpanded: boolean
  readonly isCompact: boolean
  /** The `keyboardAccelerators` flag — whether ⌥H is named at all. */
  readonly hasChords: boolean
  readonly shortcutHint?: string
  readonly revealShortcutHint: boolean
  readonly onToggle: () => void
  readonly onSelect: (destination: CaptureDestination) => void
}) {
  const SelectedGlyph = captureIconFor(captureDestinationGlyph(selected))

  return (
    <div className="relative flex min-w-0 flex-col">
      <button
        type="button"
        aria-label={`Hosting destination: ${captureDestinationLabel(selected)}`}
        aria-expanded={isExpanded}
        aria-keyshortcuts={
          hasChords ? CAPTURE_PROMPT_CHORDS.host.aria : undefined
        }
        title={
          isCompact && hasChords
            ? `Host (${CAPTURE_PROMPT_CHORDS.host.glyph})`
            : undefined
        }
        onClick={onToggle}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-kro-pill px-2.5',
          isCompact ? 'font-medium text-xs' : 'font-medium text-sm',
          'outline-none focus-visible:shadow-[var(--kro-ring-field)]',
        )}
        style={{
          minHeight: promptControlMinHeight(isCompact),
          color: colorVar('fore'),
        }}
      >
        {shortcutHint === undefined ? null : (
          <ShortcutHint placement="keycap" reveal={revealShortcutHint}>
            {shortcutHint}
          </ShortcutHint>
        )}
        <SelectedGlyph size={14} aria-hidden />
        {captureDestinationLabel(selected)}
        <ChevronDown size={10} aria-hidden />
      </button>

      {isExpanded ? (
        <div
          role="group"
          aria-label="Hosting destination"
          data-testid="capture-destination-options"
          // Floats above the button, over the rest of the prompt, so opening
          // it never grows the actions row. Upward, because the row sits at
          // the panel's foot where a downward list would be clipped.
          className="absolute bottom-full left-0 z-50 mb-1 flex min-w-40 flex-col gap-1 p-1"
          style={{
            backgroundColor: colorVar('back'),
            border: `1px solid ${colorVar('hairline')}`,
            borderRadius: radiusVar('card'),
            boxShadow: shadowVar('surface'),
          }}
        >
          {available.map((destination) => {
            const Glyph = captureIconFor(captureDestinationGlyph(destination))
            return (
              <button
                key={destination}
                type="button"
                aria-pressed={destination === selected}
                onClick={() => onSelect(destination)}
                data-selected={destination === selected ? '' : undefined}
                className={cn(
                  'kro-motion-quick inline-flex w-full items-center gap-1.5 rounded-kro-small px-2.5',
                  isCompact ? 'text-xs' : 'text-sm',
                  'border border-transparent outline-none',
                  // A real hover: a visible fill and an outline, and the same
                  // pair for keyboard focus — distinct from the selected fill.
                  'hover:border-[var(--kro-color-hairline)] hover:bg-[color-mix(in_srgb,var(--kro-color-fore)_8%,transparent)]',
                  'focus-visible:border-[var(--kro-color-hairline)] focus-visible:bg-[color-mix(in_srgb,var(--kro-color-fore)_8%,transparent)] focus-visible:shadow-[var(--kro-ring-field)]',
                  destination === selected &&
                    'bg-[var(--kro-color-back-inner)]',
                )}
                style={{
                  minHeight: promptControlMinHeight(isCompact),
                  color: colorVar('fore'),
                }}
              >
                <Glyph size={14} aria-hidden />
                <span className="flex-1 text-left">
                  {captureDestinationLabel(destination)}
                </span>
                {destination === selected ? (
                  <Check
                    size={12}
                    aria-hidden
                    data-testid="capture-destination-check"
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
