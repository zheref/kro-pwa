/** The prompt's key map as a pure decision (`capturePromptKeyboard.ts`). */
import { describe, expect, it } from 'vitest'
import {
  type CapturePromptKeyContext,
  type CapturePromptKeystroke,
  capturePromptKeyHint,
  composeCaptureStatusLine,
  resolveCapturePromptKey,
  suggestionGridNeighbour,
} from '../capturePromptKeyboard'

const stroke = (
  over: Partial<CapturePromptKeystroke>,
): CapturePromptKeystroke => ({
  key: '',
  code: '',
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  isComposing: false,
  ...over,
})

const task: CapturePromptKeyContext = {
  openPanel: null,
  timePanelInFocus: null,
  isEvent: false,
  isHabit: false,
  earnsRewards: true,
  supportsValue: true,
  supportsDuration: true,
}

describe('Return', () => {
  it('is Add from anywhere in the prompt', () => {
    expect(
      resolveCapturePromptKey(stroke({ key: 'Enter', code: 'Enter' }), task),
    ).toEqual({ kind: 'submit' })
  })

  it('is Done inside a time panel', () => {
    expect(
      resolveCapturePromptKey(stroke({ key: 'Enter', code: 'Enter' }), {
        ...task,
        timePanelInFocus: 'start',
      }),
    ).toEqual({ kind: 'confirmTime', field: 'start' })
  })

  it('does nothing mid-IME or with Cmd/Ctrl held', () => {
    expect(
      resolveCapturePromptKey(
        stroke({ key: 'Enter', code: 'Enter', isComposing: true }),
        task,
      ),
    ).toBeNull()
    expect(
      resolveCapturePromptKey(
        stroke({ key: 'Enter', code: 'Enter', metaKey: true }),
        task,
      ),
    ).toBeNull()
  })
})

describe('Option chords, by physical key', () => {
  it('picks the kind by ⌥1–4 in canon order, even when Option typed a symbol', () => {
    expect(
      resolveCapturePromptKey(
        stroke({ key: '™', code: 'Digit2', altKey: true }),
        task,
      ),
    ).toEqual({ kind: 'selectKind', captureKind: 'habit' })
    expect(
      resolveCapturePromptKey(
        stroke({ key: '¡', code: 'Digit5', altKey: true }),
        task,
      ),
    ).toBeNull()
  })

  it('opens each property by its letter, ignoring ones the kind lacks', () => {
    expect(
      resolveCapturePromptKey(
        stroke({ key: '√', code: 'KeyV', altKey: true }),
        task,
      ),
    ).toEqual({ kind: 'togglePanel', panel: 'value' })
    expect(
      resolveCapturePromptKey(stroke({ code: 'KeyE', altKey: true }), task),
    ).toBeNull()
    expect(
      resolveCapturePromptKey(stroke({ code: 'KeyE', altKey: true }), {
        ...task,
        isEvent: true,
      }),
    ).toEqual({ kind: 'toggleTime', field: 'end' })
    expect(
      resolveCapturePromptKey(stroke({ code: 'KeyD', altKey: true }), {
        ...task,
        isHabit: true,
      }),
    ).toBeNull()
  })

  it('steps rewards with ⌥↑/⌥= and ⌥↓/⌥−, only for kinds that earn', () => {
    expect(
      resolveCapturePromptKey(stroke({ code: 'ArrowUp', altKey: true }), task),
    ).toEqual({ kind: 'stepRewards', direction: 1 })
    expect(
      resolveCapturePromptKey(stroke({ code: 'Minus', altKey: true }), task),
    ).toEqual({ kind: 'stepRewards', direction: -1 })
    expect(
      resolveCapturePromptKey(stroke({ code: 'Equal', altKey: true }), {
        ...task,
        earnsRewards: false,
      }),
    ).toBeNull()
  })
})

describe('digits in an open list editor', () => {
  it('pick the nth option', () => {
    expect(
      resolveCapturePromptKey(stroke({ key: '3', code: 'Digit3' }), {
        ...task,
        openPanel: 'value',
      }),
    ).toEqual({ kind: 'pickNth', index: 2 })
  })

  it('are plain title text with no list editor open', () => {
    expect(
      resolveCapturePromptKey(stroke({ key: '3', code: 'Digit3' }), task),
    ).toBeNull()
    expect(
      resolveCapturePromptKey(stroke({ key: '3', code: 'Digit3' }), {
        ...task,
        openPanel: 'date',
      }),
    ).toBeNull()
  })

  it('ignore 0', () => {
    expect(
      resolveCapturePromptKey(stroke({ key: '0', code: 'Digit0' }), {
        ...task,
        openPanel: 'duration',
      }),
    ).toBeNull()
  })
})

describe('capturePromptKeyHint', () => {
  it('reads the rating keys while Value is open', () => {
    expect(capturePromptKeyHint('value', false, 0)).toBe(
      '1–5 to rate · ⏎ Add · esc close',
    )
  })

  it('caps the pick range at 9 and says Done inside a time panel', () => {
    expect(capturePromptKeyHint('duration', false, 12)).toBe(
      '1–9 to pick · ⏎ Add · esc close',
    )
    expect(capturePromptKeyHint(null, true, 0)).toBe(
      'Type a time · ⏎ Done · esc discard',
    )
  })

  it('is empty with nothing open', () => {
    expect(capturePromptKeyHint(null, false, 0)).toBeNull()
  })
})

describe('composeCaptureStatusLine', () => {
  it('is the reason alone while pointer-driven', () => {
    expect(
      composeCaptureStatusLine({
        reason: 'Enter a title to add this task.',
        isKeyboardDriven: false,
        editorKeys: null,
        canSubmit: false,
      }),
    ).toEqual({ reason: 'Enter a title to add this task', keys: null })
  })

  it('adds "⏎ next" to a blocked reason, or the open editor’s keys', () => {
    expect(
      composeCaptureStatusLine({
        reason: 'Pick a value rating — required for On Device.',
        isKeyboardDriven: true,
        editorKeys: null,
        canSubmit: false,
      }),
    ).toEqual({
      reason: 'Pick a value rating — required for On Device',
      keys: '⏎ next',
    })
    expect(
      composeCaptureStatusLine({
        reason: 'Pick a value rating — required for On Device.',
        isKeyboardDriven: true,
        editorKeys: '1–5 to rate · ⏎ next · esc close',
        canSubmit: false,
      }).keys,
    ).toBe('1–5 to rate · ⏎ next · esc close')
  })

  it('reads "Ready · ⏎ Add" once submittable', () => {
    expect(
      composeCaptureStatusLine({
        reason: null,
        isKeyboardDriven: true,
        editorKeys: null,
        canSubmit: true,
      }),
    ).toEqual({ reason: 'Ready', keys: '⏎ Add' })
  })

  it('says "⏎ next" inside an editor while blocked', () => {
    expect(capturePromptKeyHint('value', false, 0, false)).toBe(
      '1–5 to rate · ⏎ next · esc close',
    )
  })
})

describe('the suggestions keys', () => {
  const withPane = { ...task, hasSuggestions: true }

  it('moves focus into the pane and back on ⌥S, only while it shows', () => {
    expect(
      resolveCapturePromptKey(stroke({ code: 'KeyS', altKey: true }), withPane),
    ).toEqual({ kind: 'toggleSuggestionFocus' })
    expect(
      resolveCapturePromptKey(stroke({ code: 'KeyS', altKey: true }), task),
    ).toBeNull()
  })

  it('adds the ticked cards on ⇧⏎, never mid-IME', () => {
    expect(
      resolveCapturePromptKey(
        stroke({ key: 'Enter', code: 'Enter', shiftKey: true }),
        withPane,
      ),
    ).toEqual({ kind: 'addSelectedSuggestions' })
    expect(
      resolveCapturePromptKey(
        stroke({
          key: 'Enter',
          code: 'Enter',
          shiftKey: true,
          isComposing: true,
        }),
        withPane,
      ),
    ).toBeNull()
  })

  it('keeps ⇧⏎ as Add when there is no pane', () => {
    expect(
      resolveCapturePromptKey(
        stroke({ key: 'Enter', code: 'Enter', shiftKey: true }),
        task,
      ),
    ).toEqual({ kind: 'submit' })
  })
})

describe('suggestionGridNeighbour', () => {
  it('moves one card with ← / →', () => {
    expect(suggestionGridNeighbour(4, 9, 3, 'ArrowRight')).toBe(5)
    expect(suggestionGridNeighbour(4, 9, 3, 'ArrowLeft')).toBe(3)
  })

  it('moves one row with ↑ / ↓ — a column-count stride', () => {
    expect(suggestionGridNeighbour(4, 9, 3, 'ArrowDown')).toBe(7)
    expect(suggestionGridNeighbour(4, 9, 3, 'ArrowUp')).toBe(1)
  })

  it('stays put at an edge', () => {
    expect(suggestionGridNeighbour(0, 9, 3, 'ArrowLeft')).toBeNull()
    expect(suggestionGridNeighbour(7, 9, 3, 'ArrowDown')).toBeNull()
    expect(suggestionGridNeighbour(1, 9, 3, 'ArrowUp')).toBeNull()
  })

  it('treats an unmeasured grid as one column', () => {
    expect(suggestionGridNeighbour(0, 3, 0, 'ArrowDown')).toBe(1)
  })
})
