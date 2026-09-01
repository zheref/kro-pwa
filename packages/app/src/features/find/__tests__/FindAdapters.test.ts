/**
 * The Adapter layer — the only bridge from a vista's capabilities to a row's
 * actions. The cases that matter are the ones a hand-rolled gesture list gets
 * wrong: declaration order, the role's default tint, `buttonRow` positions, and
 * a flag-gated binding that must simply not exist.
 */
import {
  EndeavorOperation,
  NO_ENDEAVOR_CAPABILITIES,
  OperationRole,
  OperationTint,
  EndeavorsVistas,
  buttonRowGesture,
  contextMenuGesture,
  makeEndeavorCapabilities,
  makeEndeavorOperationBinding,
  resolveEndeavorCapabilities,
  swipeTrailingGesture,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  adaptedOperations,
  endeavorRowAdapter,
  endeavorRowAdapters,
  rowActionsForGesture,
} from '../FindAdapters'
import { findEndeavorMocks } from '../FindMocks'

const task = findEndeavorMocks.morningTask
const allFlagsOff = resolveEndeavorCapabilities(
  EndeavorsVistas.find.capabilities,
  () => false,
)
const detailFlagOn = resolveEndeavorCapabilities(
  EndeavorsVistas.find.capabilities,
  (flag) => flag === 'endeavorDetail',
)

describe('endeavorRowAdapter maps the Find vista onto one row', () => {
  it('keeps the leading swipe pair in declaration order — Start then Edit', () => {
    const adapter = endeavorRowAdapter(task, allFlagsOff)
    expect(
      adapter.leadingSwipeActions.map((action) => action.operation),
    ).toEqual([EndeavorOperation.startSession, EndeavorOperation.edit])
  })

  it('keeps the trailing swipe pair in declaration order — Delete then Archive', () => {
    const adapter = endeavorRowAdapter(task, allFlagsOff)
    expect(
      adapter.trailingSwipeActions.map((action) => action.operation),
    ).toEqual([EndeavorOperation.delete, EndeavorOperation.archive])
  })

  it('carries the row identity so a keyed list stays stable', () => {
    expect(endeavorRowAdapter(task, allFlagsOff).id).toBe(task.id)
  })

  it('offers NO tap action while the endeavorDetail flag is off', () => {
    expect(endeavorRowAdapter(task, allFlagsOff).tapAction).toBeNull()
  })

  it('offers the View Detail tap once the flag is on', () => {
    const adapter = endeavorRowAdapter(task, detailFlagOn)
    expect(adapter.tapAction?.operation).toBe(EndeavorOperation.viewDetail)
  })

  it('adapts a whole list in one pass', () => {
    const adapters = endeavorRowAdapters(
      [task, findEndeavorMocks.afternoonTask],
      allFlagsOff,
    )
    expect(adapters.map((adapter) => adapter.id)).toEqual([
      task.id,
      findEndeavorMocks.afternoonTask.id,
    ])
  })

  it('gives a display-only vista no actions at all', () => {
    const adapter = endeavorRowAdapter(task, NO_ENDEAVOR_CAPABILITIES)
    expect(adaptedOperations(adapter)).toEqual([])
    expect(adapter.tapAction).toBeNull()
  })
})

describe('tints and roles resolve exactly once, at the adapter', () => {
  it('applies red to a destructive binding that declares no tint', () => {
    const [deleteAction] = rowActionsForGesture(allFlagsOff, 'swipeTrailing')
    expect(deleteAction?.role).toBe(OperationRole.destructive)
    expect(deleteAction?.tint).toBe(OperationTint.red)
  })

  it('keeps a binding’s own tint over the role default', () => {
    const actions = rowActionsForGesture(allFlagsOff, 'swipeLeading')
    expect(actions[0]?.tint).toBe(OperationTint.green)
    expect(actions[1]?.tint).toBe(OperationTint.blue)
  })

  it('leaves a standard binding with no tint of its own untinted', () => {
    const capabilities = makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.triage,
        gesture: contextMenuGesture,
        icon: 'tray',
        label: 'Triage',
      }),
    ])
    expect(
      rowActionsForGesture(capabilities, 'contextMenu')[0]?.tint,
    ).toBeNull()
  })
})

describe('buttonRow actions honour their declared position', () => {
  const capabilities = makeEndeavorCapabilities([
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.archive,
      gesture: buttonRowGesture(2),
      icon: 'archivebox',
      label: 'Archive',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.markComplete,
      gesture: buttonRowGesture(1),
      icon: 'checkmark',
      label: 'Complete',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.delete,
      gesture: swipeTrailingGesture,
      role: OperationRole.destructive,
      icon: 'trash',
      label: 'Delete',
    }),
  ])

  it('renders the lower position first, whatever the declaration order', () => {
    const adapter = endeavorRowAdapter(task, capabilities)
    expect(adapter.buttonRowActions.map((action) => action.operation)).toEqual([
      EndeavorOperation.markComplete,
      EndeavorOperation.archive,
    ])
  })

  it('carries each button’s position through for the renderer', () => {
    const adapter = endeavorRowAdapter(task, capabilities)
    expect(adapter.buttonRowActions.map((action) => action.position)).toEqual([
      1, 2,
    ])
  })

  it('leaves position null for every other gesture', () => {
    const adapter = endeavorRowAdapter(task, capabilities)
    expect(adapter.trailingSwipeActions[0]?.position).toBeNull()
  })
})

describe('adaptedOperations reports exactly what the vista declared', () => {
  it('surfaces every Find binding once the flag is on', () => {
    const adapter = endeavorRowAdapter(task, detailFlagOn)
    expect(adaptedOperations(adapter)).toEqual([
      EndeavorOperation.startSession,
      EndeavorOperation.edit,
      EndeavorOperation.delete,
      EndeavorOperation.archive,
      EndeavorOperation.viewDetail,
    ])
  })

  it('drops the gated one when its flag is off', () => {
    const adapter = endeavorRowAdapter(task, allFlagsOff)
    expect(adaptedOperations(adapter)).not.toContain(
      EndeavorOperation.viewDetail,
    )
  })

  it('de-duplicates an operation declared under two gestures', () => {
    const adapter = endeavorRowAdapter(
      task,
      EndeavorsVistas.planDay.capabilities,
    )
    const operations = adaptedOperations(adapter)
    expect(new Set(operations).size).toBe(operations.length)
  })
})
