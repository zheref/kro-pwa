/**
 * Browser APIs that Radix uses and jsdom does not implement.
 *
 * Lives under `__tests__/` rather than beside the components because it is
 * test scaffolding, not shipped code — and because `@kro/app` has no Vitest
 * setup file to hang it on (that config belongs to the toolchain child, not to
 * the design system).
 *
 * Deliberately minimal: enough for a component to mount and be queried, never
 * enough to make a *positioning* assertion look meaningful. Where an element
 * lands is a real browser's answer; these stubs only stop the mount from
 * throwing.
 *
 * ==========================================================================
 * WHY NO SUITE HERE MOUNTS A RADIX POPPER
 * ==========================================================================
 *
 * Mounting `PopoverContent` or `DropdownMenuContent` — anything built on
 * `@radix-ui/react-popper` — costs 5 to 12 SECONDS of wall time per mount
 * under jsdom, and the cost grows with the number of mounts in a file. That is
 * not a slow test; it made `make test` fail outright, because Vitest's worker
 * RPC times out inside the stall:
 *
 *     Error: [vitest-worker]: Timeout calling "onTaskUpdate"
 *
 * What the stall is NOT. Measured, one at a time, on a single mounted popover:
 *   · not a render loop      — React rendered the content exactly once
 *   · not animation frames   — stubbing `requestAnimationFrame` changed nothing
 *   · not timers/microtasks  — 2 `setTimeout`s, 0 `queueMicrotask`s in the window
 *   · not layout thrash      — 8 `getBoundingClientRect`, 20 `getComputedStyle`
 *   · not the observers      — same cost with `IntersectionObserver` absent,
 *                              which is jsdom's own default
 *   · not `visualViewport`   — absent in jsdom either way
 *   · not console or stacks  — 0 messages logged, `Error.stackTraceLimit = 0`
 *                              made no difference
 *   · not the Portal         — a plain portalled `<div>` costs 0ms
 *
 * What it correlates with is the worker transport: the same mount costs ~5s on
 * the `forks` pool and ~190s on `threads`, and a microtask resolves instantly
 * while the first MACROTASK after the mount is the one that stalls. So it is
 * an artefact of the test environment, not a property of the component.
 *
 * The consequence, and the split it forces: these suites assert what this repo
 * owns — the trigger's ARIA, the open/closed contract, the canonical sizes and
 * the class composition that carries the theming — without putting a panel on
 * screen.
 *
 * The panel itself belongs to the Storybook test-runner
 * (`pnpm --filter @kro/web test:storybook`), which drives a real browser where
 * the mount is cheap and placement is worth asserting. That runner is wired
 * but is NOT part of `make test`: it needs a Storybook server and a Playwright
 * browser download, and it has not been executed yet. Until someone runs it,
 * the popper panels are covered by their stories being rendered by hand, not
 * by an automated assertion — say so rather than assuming otherwise.
 *
 * Dialog and Sheet are unaffected: `@radix-ui/react-dialog` has no popper, and
 * those suites mount and interact normally in a few hundred milliseconds.
 */

class ObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
  takeRecords(): [] {
    return []
  }
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: readonly number[] = []
}

/**
 * Installs the stubs and returns a teardown that puts the globals back.
 */
export function installRadixEnvironment(): () => void {
  const original = {
    ResizeObserver: globalThis.ResizeObserver,
    IntersectionObserver: globalThis.IntersectionObserver,
    hasPointerCapture: Element.prototype.hasPointerCapture,
    setPointerCapture: Element.prototype.setPointerCapture,
    releasePointerCapture: Element.prototype.releasePointerCapture,
    scrollIntoView: Element.prototype.scrollIntoView,
  }

  globalThis.ResizeObserver =
    ObserverStub as unknown as typeof globalThis.ResizeObserver
  globalThis.IntersectionObserver =
    ObserverStub as unknown as typeof globalThis.IntersectionObserver
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}

  return () => {
    globalThis.ResizeObserver = original.ResizeObserver
    globalThis.IntersectionObserver = original.IntersectionObserver
    Element.prototype.hasPointerCapture = original.hasPointerCapture
    Element.prototype.setPointerCapture = original.setPointerCapture
    Element.prototype.releasePointerCapture = original.releasePointerCapture
    Element.prototype.scrollIntoView = original.scrollIntoView
  }
}
