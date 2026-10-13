/** Resting light, from the upper left — the same place as the glass sheen. */
export const GLASS_LIGHT_REST_X = 0.47
export const GLASS_LIGHT_REST_Y = 0.88

export interface GlassLightRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

/**
 * Offsets for the bright edge, in px, pointing at the pointer.
 * Positive x lights the left edge; positive y lights the top edge.
 * A pointer sitting on the piece keeps the resting light.
 */
export function glassLightOffset(
  pointerX: number,
  pointerY: number,
  rect: GlassLightRect,
): { readonly x: number; readonly y: number } {
  const dx = pointerX - (rect.left + rect.width / 2)
  const dy = pointerY - (rect.top + rect.height / 2)
  const length = Math.hypot(dx, dy)
  if (length < 0.5) return { x: GLASS_LIGHT_REST_X, y: GLASS_LIGHT_REST_Y }
  return {
    x: Math.round((-dx / length) * 100) / 100,
    y: Math.round((-dy / length) * 100) / 100,
  }
}

/** How much of the remaining distance the rim covers each frame. */
export const GLASS_LIGHT_FOLLOW = 0.22

/**
 * Ease the rim toward the pointer. One step never snaps to the target,
 * so the edge glides instead of stepping.
 */
export function approachGlassLight(
  current: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number },
  follow = GLASS_LIGHT_FOLLOW,
): { readonly x: number; readonly y: number } {
  return {
    x: current.x + (target.x - current.x) * follow,
    y: current.y + (target.y - current.y) * follow,
  }
}
/** The class the script toggles: the pointer is inside this piece's box. */
export const GLASS_LIT_CLASS = 'kro-glass--lit'

/** Whether the pointer is inside the piece's box (edges inclusive). */
export function pointerInsideGlass(
  pointerX: number,
  pointerY: number,
  rect: GlassLightRect,
): boolean {
  return (
    pointerX >= rect.left &&
    pointerX <= rect.left + rect.width &&
    pointerY >= rect.top &&
    pointerY <= rect.top + rect.height
  )
}

/** Where a bar's bottom hotspot rests, as a share of the bar's width. */
export const GLASS_BAR_REST_SHARE = 0.3

/**
 * The bottom-edge hotspot of a bar, in px from the bar's left: the pointer's x
 * along the bar, clamped to the bar. Only x matters — a bar has one lit edge.
 */
export function glassBarOffset(pointerX: number, rect: GlassLightRect): number {
  const along = pointerX - rect.left
  return Math.round(Math.min(Math.max(along, 0), rect.width))
}

/** Ease a bar's hotspot toward its target; one step never lands on it. */
export function approachGlassBar(
  current: number,
  target: number,
  follow = GLASS_LIGHT_FOLLOW,
): number {
  return current + (target - current) * follow
}

/**
 * Aim every glass piece's light at the pointer.
 *
 * - A piece the pointer is outside of gets its rim aimed at the pointer; the
 *   rim eases over several frames and keeps easing after the pointer stops.
 * - A piece the pointer is inside of is LIT (`kro-glass--lit`): the stylesheet
 *   draws a uniform glow and the pointer's position stops mattering.
 * - A bar's bottom hotspot follows the pointer's x.
 *
 * Reduced motion: no tracking and no easing (the stylesheet's resting light
 * stays), but the lit class is still toggled — a static state is not motion.
 * Touch never moves the light; a press lights a control through `:active`.
 */
export function startGlassLight(doc: Document = document): () => void {
  if (typeof window === 'undefined') return () => {}
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  const tracking = !reduce?.matches

  let frame = 0
  let running = false
  let pointerX = Number.NaN
  let pointerY = Number.NaN
  const placed = new WeakMap<HTMLElement, { x: number; y: number }>()
  const placedBar = new WeakMap<HTMLElement, number>()

  const paint = () => {
    running = false
    let stillMoving = false
    const nodes = doc.querySelectorAll<HTMLElement>('.kro-glass')
    for (const node of nodes) {
      const rect = node.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const inside = pointerInsideGlass(pointerX, pointerY, rect)
      node.classList.toggle(GLASS_LIT_CLASS, inside)
      if (!tracking || Number.isNaN(pointerX)) continue

      if (node.classList.contains('kro-glass--bar')) {
        const target = glassBarOffset(pointerX, rect)
        const from = placedBar.get(node) ?? rect.width * GLASS_BAR_REST_SHARE
        const next = approachGlassBar(from, target)
        placedBar.set(node, next)
        node.style.setProperty('--kro-glass-bar-x', `${roundPx(next)}px`)
        if (Math.abs(target - next) > 0.5) stillMoving = true
        continue
      }

      if (inside) continue
      const target = glassLightOffset(pointerX, pointerY, rect)
      const from = placed.get(node) ?? {
        x: GLASS_LIGHT_REST_X,
        y: GLASS_LIGHT_REST_Y,
      }
      const next = approachGlassLight(from, target)
      placed.set(node, next)
      node.style.setProperty('--kro-glass-light-x', `${roundPx(next.x)}px`)
      node.style.setProperty('--kro-glass-light-y', `${roundPx(next.y)}px`)
      if (Math.hypot(target.x - next.x, target.y - next.y) > 0.004) {
        stillMoving = true
      }
    }
    if (stillMoving) {
      running = true
      frame = window.requestAnimationFrame(paint)
    }
  }

  const schedule = () => {
    if (running) return
    running = true
    frame = window.requestAnimationFrame(paint)
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    pointerX = event.clientX
    pointerY = event.clientY
    schedule()
  }

  // The pointer left the window: nothing is under it any more.
  const onLeave = () => {
    pointerX = Number.NaN
    pointerY = Number.NaN
    schedule()
  }

  doc.addEventListener('pointermove', onMove, { passive: true })
  doc.documentElement.addEventListener('pointerleave', onLeave)
  return () => {
    doc.removeEventListener('pointermove', onMove)
    doc.documentElement.removeEventListener('pointerleave', onLeave)
    window.cancelAnimationFrame(frame)
  }
}

function roundPx(value: number): number {
  return Math.round(value * 100) / 100
}
