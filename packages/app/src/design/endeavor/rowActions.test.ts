import {
  EndeavorOperation,
  EndeavorsVistas,
  OperationRole,
  OperationTint,
  buttonRowGesture,
  contextMenuGesture,
  fixedEndeavorsVistas,
  makeEndeavorCapabilities,
  makeEndeavorOperationBinding,
  swipeLeadingGesture,
  swipeTrailingGesture,
  tapGesture,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  bindingColorRole,
  resolveRowActions,
  tintColorRole,
} from './rowActions'

const complete = makeEndeavorOperationBinding({
  operation: EndeavorOperation.markComplete,
  gesture: swipeLeadingGesture,
  icon: 'checkmark.circle',
  label: 'Complete',
  tint: OperationTint.green,
})

const remove = makeEndeavorOperationBinding({
  operation: EndeavorOperation.delete,
  gesture: swipeTrailingGesture,
  role: OperationRole.destructive,
  icon: 'trash',
  label: 'Delete',
})

const share = makeEndeavorOperationBinding({
  operation: EndeavorOperation.share,
  gesture: contextMenuGesture,
  icon: 'archivebox',
  label: 'Share',
})

const detail = makeEndeavorOperationBinding({
  operation: EndeavorOperation.viewDetail,
  gesture: tapGesture,
  icon: 'info.circle',
  label: 'Details',
})

const capabilities = makeEndeavorCapabilities([complete, remove, share, detail])

describe('resolveRowActions — the same props, two grammars', () => {
  it('gives a finger swipe surfaces on both edges', () => {
    const actions = resolveRowActions(capabilities, 'touch')

    expect(actions.leadingSwipe).toEqual([complete])
    expect(actions.trailingSwipe).toEqual([remove])
    expect(actions.hoverActions).toEqual([])
  })

  it('gives a mouse the SAME bindings as a hover strip instead', () => {
    const actions = resolveRowActions(capabilities, 'pointer')

    expect(actions.leadingSwipe).toEqual([])
    expect(actions.trailingSwipe).toEqual([])
    expect(actions.hoverActions).toEqual([complete, remove])
  })

  it('adds the swipe bindings to the POINTER context menu, so right-click reaches everything', () => {
    const pointer = resolveRowActions(capabilities, 'pointer')
    const touch = resolveRowActions(capabilities, 'touch')

    expect(pointer.contextMenu).toEqual([share, complete, remove])
    // On touch the swipe IS the route, so the long-press menu stays canon's.
    expect(touch.contextMenu).toEqual([share])
  })

  it('loses no binding on either input type — the property that makes this safe', () => {
    for (const input of ['touch', 'pointer'] as const) {
      const actions = resolveRowActions(capabilities, input)
      const reachable = new Set(
        [
          ...actions.leadingSwipe,
          ...actions.trailingSwipe,
          ...actions.hoverActions,
          ...actions.contextMenu,
          ...actions.buttonRow,
          ...actions.prepOverlay,
          ...(actions.tap === null ? [] : [actions.tap]),
        ].map((binding) => binding.operation),
      )
      for (const binding of capabilities.operations) {
        expect(
          reachable.has(binding.operation),
          `${binding.operation} is unreachable on ${input}`,
        ).toBe(true)
      }
    }
  })

  it('keeps every shipped vista’s bindings reachable on both input types', () => {
    for (const vista of fixedEndeavorsVistas) {
      for (const input of ['touch', 'pointer'] as const) {
        const actions = resolveRowActions(vista.capabilities, input)
        const reachable =
          actions.leadingSwipe.length +
          actions.trailingSwipe.length +
          actions.hoverActions.length +
          actions.contextMenu.length +
          actions.buttonRow.length +
          actions.prepOverlay.length +
          (actions.tap === null ? 0 : 1)
        expect(reachable, `${vista.id} on ${input}`).toBeGreaterThanOrEqual(
          vista.capabilities.operations.length,
        )
      }
    }
  })

  it('orders the inline button row by position, not by declaration', () => {
    const second = makeEndeavorOperationBinding({
      operation: EndeavorOperation.edit,
      gesture: buttonRowGesture(2),
      icon: 'pencil',
      label: 'Edit',
    })
    const first = makeEndeavorOperationBinding({
      operation: EndeavorOperation.triage,
      gesture: buttonRowGesture(1),
      icon: 'archivebox',
      label: 'Triage',
    })

    const actions = resolveRowActions(
      makeEndeavorCapabilities([second, first]),
      'touch',
    )

    expect(actions.buttonRow.map((binding) => binding.label)).toEqual([
      'Triage',
      'Edit',
    ])
  })

  it('reports no tap binding for a vista that declares none', () => {
    const actions = resolveRowActions(
      EndeavorsVistas.inbox.capabilities,
      'touch',
    )
    expect(actions.tap).toBeNull()
  })
})

describe('tintColorRole', () => {
  it('maps every canon tint onto a contrast-verified badge role', () => {
    expect(tintColorRole(OperationTint.green)).toBe('badgeGreen')
    expect(tintColorRole(OperationTint.blue)).toBe('badgeBlue')
    expect(tintColorRole(OperationTint.orange)).toBe('badgeOrange')
    expect(tintColorRole(OperationTint.red)).toBe('badgeRed')
    expect(tintColorRole(OperationTint.purple)).toBe('badgePurple')
    expect(tintColorRole(OperationTint.gray)).toBe('badgeNeutral')
  })

  it('falls back to the live accent for an untinted standard binding', () => {
    expect(tintColorRole(null)).toBe('accent')
  })

  it('paints an untinted DESTRUCTIVE binding red, via the role default', () => {
    // The role default lives in `@kro/core`'s `effectiveTintOf`; this proves the
    // render tier honours it rather than re-deciding.
    expect(bindingColorRole(remove)).toBe('badgeRed')
  })
})
