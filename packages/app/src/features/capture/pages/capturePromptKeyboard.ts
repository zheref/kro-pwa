/**
 * The capture prompt's keyboard map — a pure decision from a keystroke and the
 * prompt's shape to one intent. The Fragment performs the intent through its
 * callbacks; nothing here touches the DOM or the store.
 *
 * Canon (`EndeavorInputPrompt.swift`) defines no keyboard shortcuts, so this
 * scheme is the web's own, recorded in `docs/Features/Inbox.md` (Web notes).
 *
 * - **Return** (no modifier) is always *Add* from anywhere in the prompt — a
 *   focused pill, star or preset never swallows it. The one exception is an
 *   open time panel, where Return is that panel's *Done*. Never mid-IME.
 * - **Option/Alt chords**, matched on `event.code` because Option+letter
 *   types a special character on macOS: ⌥1–4 kind, ⌥V value, ⌥U duration,
 *   ⌥D date, ⌥T time/start, ⌥E end (events), ⌥R repeat, ⌥H host, ⌥J emoji,
 *   ⌥↑/⌥= and ⌥↓/⌥− rewards. No Cmd/Ctrl chord is taken.
 * - **Digits 1–9** (no modifier) pick the nth option of an open list editor
 *   (value stars, duration presets, repeat presets, hosts) and close it. While
 *   such an editor is open a digit is the pick, not title text.
 */
import { assertNever } from '@kro/core'
import type { CaptureTimeField } from '../CaptureFeature'
import { type CaptureKind, captureKinds } from '../CaptureRules'

/** The inline panels, as the Fragment names them. */
export type CapturePromptPanel =
  | 'value'
  | 'duration'
  | 'date'
  | 'rewards'
  | 'repeat'
  | 'destination'

/** What a keystroke asks the prompt to do. */
export type CapturePromptKeyIntent =
  | { readonly kind: 'submit' }
  | { readonly kind: 'confirmTime'; readonly field: CaptureTimeField }
  | { readonly kind: 'selectKind'; readonly captureKind: CaptureKind }
  | { readonly kind: 'togglePanel'; readonly panel: CapturePromptPanel }
  | { readonly kind: 'toggleTime'; readonly field: CaptureTimeField }
  | { readonly kind: 'openEmoji' }
  | { readonly kind: 'stepRewards'; readonly direction: 1 | -1 }
  | { readonly kind: 'pickNth'; readonly index: number }
  | { readonly kind: 'toggleSuggestionFocus' }
  | { readonly kind: 'addSelectedSuggestions' }

/** The keystroke, reduced to what the map reads. */
export interface CapturePromptKeystroke {
  readonly key: string
  readonly code: string
  readonly altKey: boolean
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly shiftKey: boolean
  readonly isComposing: boolean
}

/** The prompt's shape at the moment of the keystroke. */
export interface CapturePromptKeyContext {
  readonly openPanel: CapturePromptPanel | null
  /** The time panel the focus sits in, if any. */
  readonly timePanelInFocus: CaptureTimeField | null
  readonly isEvent: boolean
  readonly isHabit: boolean
  readonly earnsRewards: boolean
  readonly supportsValue: boolean
  readonly supportsDuration: boolean
  /** The suggestions pane is showing (desktop, flag on). */
  readonly hasSuggestions?: boolean
}

/** The list editors a digit picks from. */
const LIST_PANELS: readonly CapturePromptPanel[] = [
  'value',
  'duration',
  'repeat',
  'destination',
]

const digitOf = (code: string): number | null => {
  const match = /^(?:Digit|Numpad)([0-9])$/.exec(code)
  return match === null ? null : Number(match[1])
}

export const resolveCapturePromptKey = (
  stroke: CapturePromptKeystroke,
  context: CapturePromptKeyContext,
): CapturePromptKeyIntent | null => {
  if (stroke.isComposing) return null
  // Cmd/Ctrl belong to the browser and the OS; the prompt never takes them.
  if (stroke.metaKey || stroke.ctrlKey) return null

  // ⇧⏎ — add every ticked suggestion to the Inbox.
  if (
    stroke.key === 'Enter' &&
    stroke.shiftKey &&
    !stroke.altKey &&
    context.hasSuggestions === true
  ) {
    return { kind: 'addSelectedSuggestions' }
  }

  if (stroke.key === 'Enter' && !stroke.altKey) {
    return context.timePanelInFocus === null
      ? { kind: 'submit' }
      : { kind: 'confirmTime', field: context.timePanelInFocus }
  }

  if (stroke.altKey) {
    const digit = digitOf(stroke.code)
    if (digit !== null) {
      const captureKind = captureKinds[digit - 1]
      return captureKind === undefined
        ? null
        : { kind: 'selectKind', captureKind }
    }
    switch (stroke.code) {
      case 'KeyV':
        return context.supportsValue
          ? { kind: 'togglePanel', panel: 'value' }
          : null
      case 'KeyU':
        return context.supportsDuration
          ? { kind: 'togglePanel', panel: 'duration' }
          : null
      case 'KeyD':
        return context.isHabit ? null : { kind: 'togglePanel', panel: 'date' }
      case 'KeyT':
        return { kind: 'toggleTime', field: 'start' }
      case 'KeyE':
        return context.isEvent ? { kind: 'toggleTime', field: 'end' } : null
      case 'KeyR':
        return { kind: 'togglePanel', panel: 'repeat' }
      case 'KeyH':
        return { kind: 'togglePanel', panel: 'destination' }
      case 'KeyJ':
        return { kind: 'openEmoji' }
      case 'KeyS':
        return context.hasSuggestions === true
          ? { kind: 'toggleSuggestionFocus' }
          : null
      case 'ArrowUp':
      case 'Equal':
      case 'NumpadAdd':
        return context.earnsRewards
          ? { kind: 'stepRewards', direction: 1 }
          : null
      case 'ArrowDown':
      case 'Minus':
      case 'NumpadSubtract':
        return context.earnsRewards
          ? { kind: 'stepRewards', direction: -1 }
          : null
      default:
        return null
    }
  }

  if (
    !stroke.shiftKey &&
    context.openPanel !== null &&
    LIST_PANELS.includes(context.openPanel)
  ) {
    const digit = digitOf(stroke.code)
    if (digit !== null && digit >= 1)
      return { kind: 'pickNth', index: digit - 1 }
  }

  return null
}

/** Each pill's chord: `aria-keyshortcuts` value and its ⌥ spelling. */
export const CAPTURE_PROMPT_CHORDS = {
  value: { aria: 'Alt+V', glyph: '⌥V' },
  duration: { aria: 'Alt+U', glyph: '⌥U' },
  date: { aria: 'Alt+D', glyph: '⌥D' },
  time: { aria: 'Alt+T', glyph: '⌥T' },
  end: { aria: 'Alt+E', glyph: '⌥E' },
  repeat: { aria: 'Alt+R', glyph: '⌥R' },
  host: { aria: 'Alt+H', glyph: '⌥H' },
  emoji: { aria: 'Alt+J', glyph: '⌥J' },
  suggestions: { aria: 'Alt+S', glyph: '⌥S' },
  rewards: { aria: 'Alt+ArrowUp Alt+ArrowDown', glyph: '⌥↑↓' },
} as const

/**
 * The status line's hint while an editor is open — short enough for the
 * one-line bar. `null` with nothing open.
 */
export const capturePromptKeyHint = (
  panel: CapturePromptPanel | null,
  editingTime: boolean,
  optionCount: number,
  canSubmit = true,
): string | null => {
  // Return adds only when nothing blocks; otherwise it walks to the next
  // unmet requirement.
  const ret = canSubmit ? '⏎ Add' : '⏎ next'
  if (editingTime) return 'Type a time · ⏎ Done · esc discard'
  switch (panel) {
    case null:
      return null
    case 'value':
      return `1–5 to rate · ${ret} · esc close`
    case 'duration':
    case 'repeat':
    case 'destination':
      return `1–${Math.min(9, optionCount)} to pick · ${ret} · esc close`
    case 'date':
      return `Type a date · ${ret} · esc close`
    case 'rewards':
      return `⌥↑ ⌥↓ to adjust · ${ret} · esc close`
    default:
      return assertNever(panel)
  }
}

/** The status line, split so the keys survive when the reason is cut short. */
export interface CaptureStatusLine {
  /** The reason (or "Ready"), `null` when there is nothing to say. */
  readonly reason: string | null
  /** What to press next, `null` when no keys are shown. */
  readonly keys: string | null
}

/**
 * The one bottom line. Pointer-driven: the blocking reason alone. Keyboard-
 * driven (desktop only): the reason plus the next step — the open editor's
 * keys, else "⏎ next" (Return walks to the next unmet requirement), else
 * "Ready · ⏎ Add". A trailing period is dropped so the parts join cleanly.
 */
export const composeCaptureStatusLine = (params: {
  readonly reason: string | null
  readonly isKeyboardDriven: boolean
  readonly editorKeys: string | null
  readonly canSubmit: boolean
}): CaptureStatusLine => {
  const reason = params.reason?.replace(/\.$/, '') ?? null
  if (!params.isKeyboardDriven) return { reason, keys: null }
  if (params.editorKeys !== null) return { reason, keys: params.editorKeys }
  if (params.canSubmit) return { reason: reason ?? 'Ready', keys: '⏎ Add' }
  return { reason, keys: '⏎ next' }
}

/**
 * The suggestions grid's arrow keys: ←/→ move one card, ↑/↓ one row (a
 * column-count stride). `null` at an edge — the focus stays put.
 */
export const suggestionGridNeighbour = (
  index: number,
  count: number,
  columns: number,
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
): number | null => {
  const stride = Math.max(1, columns)
  const next =
    key === 'ArrowLeft'
      ? index - 1
      : key === 'ArrowRight'
        ? index + 1
        : key === 'ArrowUp'
          ? index - stride
          : index + stride
  return next >= 0 && next < count ? next : null
}
