/**
 * Scroll a section into view, and optionally move focus into it.
 *
 * Not navigation (`RC-17` governs routing): the page never leaves its URL.
 * Motion honours the visitor's reduced-motion setting. Safe off the DOM — a
 * missing element is a no-op.
 */
export function scrollToSection(id: string, focusSelector?: string): void {
  if (typeof document === 'undefined') return
  const target = document.getElementById(id)
  if (target === null) return
  const reduced =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView?.({
    behavior: reduced ? 'auto' : 'smooth',
    block: 'start',
  })
  if (focusSelector === undefined) return
  const focusable = target.querySelector<HTMLElement>(focusSelector)
  focusable?.focus({ preventScroll: true })
}
