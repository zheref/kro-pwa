import { describe, expect, it } from 'vitest'
import {
  EndeavorOperation,
  NO_ENDEAVOR_CAPABILITIES,
  OperationRole,
  OperationTint,
  bindingsForGesture,
  buttonRowGesture,
  contextMenuGesture,
  effectiveTintOf,
  endeavorOperationFromRawValue,
  endeavorOperations,
  makeEndeavorCapabilities,
  makeEndeavorOperationBinding,
  operationGestureKinds,
  operationTintFromRawValue,
  operationTints,
  prepOverlayGesture,
  resolveEndeavorCapabilities,
  requiredFlagsOf,
  swipeLeadingGesture,
  swipeTrailingGesture,
  tapGesture,
} from '../EndeavorCapabilities'
import { EndeavorsVistas } from '../EndeavorsVistas'

const DETAIL_FLAG = 'endeavorDetail'

const gated = makeEndeavorCapabilities([
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.startSession,
    gesture: swipeLeadingGesture,
    icon: 'play.fill',
    label: 'Start',
    tint: OperationTint.green,
  }),
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.viewDetail,
    gesture: tapGesture,
    icon: 'info.circle',
    label: 'View Detail',
    requires: DETAIL_FLAG,
  }),
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.share,
    gesture: contextMenuGesture,
    icon: 'square.and.arrow.up',
    label: 'Share',
    requires: 'sharing',
  }),
])

describe('the closed operation catalog', () => {
  it('carries canon’s thirteen operations, in declaration order', () => {
    expect(endeavorOperations).toEqual([
      'markComplete',
      'markIncomplete',
      'defer',
      'delete',
      'archive',
      'unarchive',
      'startSession',
      'execute',
      'edit',
      'share',
      'triage',
      'dismissSuggestion',
      'viewDetail',
    ])
  })

  it('offers no escape hatch — a name outside the catalog does not narrow', () => {
    expect(endeavorOperationFromRawValue('custom')).toBeNull()
  })

  it('narrows a persisted operation name back into the union', () => {
    expect(endeavorOperationFromRawValue('dismissSuggestion')).toBe(
      EndeavorOperation.dismissSuggestion,
    )
  })
})

describe('gestures', () => {
  it('carries canon’s six gesture kinds, in declaration order', () => {
    expect(operationGestureKinds).toEqual([
      'swipeLeading',
      'swipeTrailing',
      'contextMenu',
      'tap',
      'prepOverlay',
      'buttonRow',
    ])
  })

  it('is the only gesture carrying a payload: buttonRow keeps its position', () => {
    expect(buttonRowGesture(2)).toEqual({ kind: 'buttonRow', position: 2 })
  })

  it('groups every button-row binding under one kind, whatever its position', () => {
    const row = makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.edit,
        gesture: buttonRowGesture(0),
        icon: 'pencil',
        label: 'Edit',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.share,
        gesture: buttonRowGesture(1),
        icon: 'square.and.arrow.up',
        label: 'Share',
      }),
    ])
    expect(bindingsForGesture(row, 'buttonRow')).toHaveLength(2)
  })
})

describe('bindingsForGesture', () => {
  it('returns Find’s two leading-swipe buttons in declaration order — that IS the button order', () => {
    const leading = bindingsForGesture(
      EndeavorsVistas.find.capabilities,
      'swipeLeading',
    )
    expect(leading.map((binding) => binding.operation)).toEqual([
      'startSession',
      'edit',
    ])
  })

  it('returns nothing for a gesture the vista binds nowhere', () => {
    expect(
      bindingsForGesture(EndeavorsVistas.find.capabilities, 'prepOverlay'),
    ).toEqual([])
  })

  it('returns nothing at all from a display-only vista', () => {
    for (const kind of operationGestureKinds) {
      expect(bindingsForGesture(NO_ENDEAVOR_CAPABILITIES, kind)).toEqual([])
    }
  })
})

describe('flag gating — resolveEndeavorCapabilities', () => {
  it('drops the dark-launched binding when its flag is off, keeping the rest in order', () => {
    const resolved = resolveEndeavorCapabilities(gated, () => false)
    expect(resolved.operations.map((binding) => binding.operation)).toEqual([
      'startSession',
    ])
  })

  it('restores the binding once the flag is on', () => {
    const resolved = resolveEndeavorCapabilities(
      gated,
      (flag) => flag === DETAIL_FLAG,
    )
    expect(resolved.operations.map((binding) => binding.operation)).toEqual([
      'startSession',
      'viewDetail',
    ])
  })

  it('keeps every ungated binding no matter what the resolver says', () => {
    const resolved = resolveEndeavorCapabilities(
      EndeavorsVistas.inbox.capabilities,
      () => false,
    )
    expect(resolved.operations).toEqual(
      EndeavorsVistas.inbox.capabilities.operations,
    )
  })

  it('leaves the input untouched — resolution is a copy, not an edit', () => {
    const before = [...gated.operations]
    resolveEndeavorCapabilities(gated, () => false)
    expect(gated.operations).toEqual(before)
  })

  it('gates each flag independently, so one enabled flag does not admit the other', () => {
    const resolved = resolveEndeavorCapabilities(
      gated,
      (flag) => flag === 'sharing',
    )
    expect(resolved.operations.map((binding) => binding.operation)).toEqual([
      'startSession',
      'share',
    ])
  })
})

describe('requiredFlagsOf', () => {
  it('lists the flag keys #11 must be able to answer for a gated set', () => {
    expect(requiredFlagsOf(gated)).toEqual([DETAIL_FLAG, 'sharing'])
  })

  it('reports nothing for a set with no gated binding', () => {
    expect(requiredFlagsOf(EndeavorsVistas.doTab.capabilities)).toEqual([])
  })

  it('reports a flag once even when two bindings share it', () => {
    const twice = makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.viewDetail,
        gesture: tapGesture,
        icon: 'info.circle',
        label: 'View Detail',
        requires: DETAIL_FLAG,
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.viewDetail,
        gesture: contextMenuGesture,
        icon: 'info.circle',
        label: 'View Detail',
        requires: DETAIL_FLAG,
      }),
    ])
    expect(requiredFlagsOf(twice)).toEqual([DETAIL_FLAG])
  })
})

describe('binding defaults and tints', () => {
  it('defaults an unstated role to standard and an unstated gate to null', () => {
    const binding = makeEndeavorOperationBinding({
      operation: EndeavorOperation.execute,
      gesture: prepOverlayGesture,
      icon: 'bolt',
      label: 'Start now',
    })
    expect(binding.role).toBe(OperationRole.standard)
    expect(binding.requires).toBeNull()
    expect(binding.tint).toBeNull()
  })

  it('resolves a destructive binding with no tint to red', () => {
    const destructive = makeEndeavorOperationBinding({
      operation: EndeavorOperation.delete,
      gesture: swipeTrailingGesture,
      role: OperationRole.destructive,
      icon: 'trash',
      label: 'Delete',
    })
    expect(effectiveTintOf(destructive)).toBe(OperationTint.red)
  })

  it('lets a declared tint win over the role default', () => {
    const archive = makeEndeavorOperationBinding({
      operation: EndeavorOperation.archive,
      gesture: swipeTrailingGesture,
      icon: 'archivebox',
      label: 'Archive',
      tint: OperationTint.orange,
    })
    expect(effectiveTintOf(archive)).toBe(OperationTint.orange)
  })

  it('leaves a standard binding with no tint to the system default', () => {
    const complete = makeEndeavorOperationBinding({
      operation: EndeavorOperation.markComplete,
      gesture: tapGesture,
      icon: 'checkmark.circle',
      label: 'Complete',
    })
    expect(effectiveTintOf(complete)).toBeNull()
  })
})

describe('tint tokens', () => {
  it('carries canon’s six tokens, in declaration order', () => {
    expect(operationTints).toEqual([
      'green',
      'blue',
      'orange',
      'red',
      'purple',
      'gray',
    ])
  })

  it('narrows a raw token back into the union', () => {
    expect(operationTintFromRawValue('purple')).toBe(OperationTint.purple)
  })

  it('refuses a colour the token set does not carry', () => {
    expect(operationTintFromRawValue('indigo')).toBeNull()
  })
})
