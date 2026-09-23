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
/**
 * Aim every glass piece's rim at the pointer.
 * The rim eases over several frames, and keeps easing after the pointer
 * stops, so it does not step. Reduced motion keeps the resting light
 * from the stylesheet. Touch does not move the light.
 */
export function startGlassLight(doc: Document = document): () => void {
  if (typeof window === 'undefined') return () => {}
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  if (reduce?.matches) return () => {}

  let frame = 0
  let running = false
  let pointerX = 0
  let pointerY = 0
  const placed = new WeakMap<HTMLElement, { x: number; y: number }>()

  const paint = () => {
    running = false
    let stillMoving = false
    const nodes = doc.querySelectorAll<HTMLElement>('.kro-glass')
    for (const node of nodes) {
      const rect = node.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
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

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    pointerX = event.clientX
    pointerY = event.clientY
    if (running) return
    running = true
    frame = window.requestAnimationFrame(paint)
  }

  doc.addEventListener('pointermove', onMove, { passive: true })
  return () => {
    doc.removeEventListener('pointermove', onMove)
    window.cancelAnimationFrame(frame)
  }
}

function roundPx(value: number): number {
  return Math.round(value * 100) / 100
}
