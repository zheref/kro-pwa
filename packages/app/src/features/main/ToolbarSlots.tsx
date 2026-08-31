'use client'

/**
 * Toolbar slots — the shell provides the placements, feature UIs fill them.
 *
 * Canon's toolbars are assembled by SwiftUI: `MainScreen` installs the
 * container's items (`mainScreenToolbar`, `macDoToolbar`) and a child screen's
 * own `.toolbar { … }` is *merged* into the same bar by the framework. React
 * has no such merge, and the shell renders **above** the destination in the
 * tree, so a feature's controls cannot be passed up as props.
 *
 * This is the merge, done explicitly: the shell renders an outlet per
 * placement, a destination renders `<ToolbarSlot placement="primary">` deep
 * inside its own tree, and the children are portalled into the outlet. The
 * shell therefore hardcodes none of a feature's controls — it owns Profile and
 * Inbox (which are the *container's*, per canon's ownership rule) and leaves
 * Notifications, Refresh and Visibility to whoever owns them.
 *
 * **Why a portal rather than a context registry.** A registry would hold React
 * nodes in state; a node's identity changes on every render of its owner, so
 * "register on render" is a re-render loop with extra steps. A portal moves
 * the same element to a different DOM parent and re-renders it exactly when
 * its owner re-renders — no shell state, no loop, and the slot's content stays
 * inside its owner's context (its store bindings keep working).
 */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * The placements canon's two toolbars have.
 *
 * `navigation` and `primary` are the Mac's two `ToolbarItemGroup` placements
 * (`.navigation`, `.primaryAction`); `leading` and `trailing` are the phone's
 * (`.topBarLeading`, `.topBarTrailing`). Both shells expose all four so a
 * feature does not have to branch on the shell to place a control.
 */
export type ToolbarPlacement =
  | 'navigation'
  | 'primary'
  | 'leading'
  | 'trailing'

export const TOOLBAR_PLACEMENTS: readonly ToolbarPlacement[] = [
  'navigation',
  'primary',
  'leading',
  'trailing',
]

type Containers = Partial<Record<ToolbarPlacement, HTMLElement | null>>

interface ToolbarSlotsValue {
  readonly containers: Containers
  readonly attach: (
    placement: ToolbarPlacement,
    element: HTMLElement | null,
  ) => void
}

const ToolbarSlotsContext = createContext<ToolbarSlotsValue | null>(null)

/**
 * The shell wraps its tree in this once. State changes only when an outlet
 * mounts or unmounts — never on a slot's re-render.
 */
export function ToolbarSlotsProvider({
  children,
}: {
  readonly children: ReactNode
}) {
  const [containers, setContainers] = useState<Containers>({})

  const attach = useCallback(
    (placement: ToolbarPlacement, element: HTMLElement | null) => {
      setContainers((current) =>
        current[placement] === element
          ? current
          : { ...current, [placement]: element },
      )
    },
    [],
  )

  const value = useMemo<ToolbarSlotsValue>(
    () => ({ containers, attach }),
    [containers, attach],
  )

  return (
    <ToolbarSlotsContext.Provider value={value}>
      {children}
    </ToolbarSlotsContext.Provider>
  )
}

/**
 * Where a placement's slotted controls land. Rendered by the shell's toolbar.
 *
 * It is an ordinary element, so the shell's own controls sit beside it in the
 * same flex row and the spacing rule (`minimumControlSpacing`) applies to
 * both.
 */
export function ToolbarOutlet({
  placement,
  className,
}: {
  readonly placement: ToolbarPlacement
  readonly className?: string
}) {
  const attach = useContext(ToolbarSlotsContext)?.attach

  // The ref callback MUST keep its identity across renders. React detaches a
  // ref whose function identity changed — calling it with `null` and then with
  // the element again — so an inline arrow here is an infinite
  // attach/detach/setState loop, not a style preference.
  const ref = useCallback(
    (element: HTMLElement | null) => {
      attach?.(placement, element)
    },
    [attach, placement],
  )

  return (
    <div className={className} data-toolbar-outlet={placement} ref={ref} />
  )
}

/**
 * A feature's controls, placed into the shell's toolbar.
 *
 * Renders nothing until the outlet exists — which on a server render is
 * always, and on the client is the same commit. Chrome that appears one frame
 * late is the correct trade for a shell that never holds a feature's nodes.
 */
export function ToolbarSlot({
  placement,
  children,
}: {
  readonly placement: ToolbarPlacement
  readonly children: ReactNode
}) {
  const value = useContext(ToolbarSlotsContext)
  const container = value?.containers[placement] ?? null

  if (container === null) return null
  return createPortal(children, container)
}

/**
 * Whether a `ToolbarSlot` would currently render — useful to a feature that
 * wants to fall back to in-content chrome outside a shell (a story, a test).
 */
export function useToolbarOutletPresent(
  placement: ToolbarPlacement,
): boolean {
  const value = useContext(ToolbarSlotsContext)
  return (value?.containers[placement] ?? null) !== null
}
