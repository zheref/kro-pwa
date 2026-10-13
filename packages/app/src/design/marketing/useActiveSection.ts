'use client'

import { useEffect, useState } from 'react'

/**
 * Which of `ids` is crossing the middle band of the viewport.
 *
 * The band is the 10% strip between 40% and 50% from the top
 * (`rootMargin: '-40% 0px -50% 0px'`), so exactly one tall section is active
 * at a time and the answer flips as a section's top passes mid-screen.
 *
 * SSR-safe: the first render — on the server and on the client — is `null`;
 * the observer only exists after mount. Absent ids are ignored.
 *
 * @param ids  element ids to watch, in document order.
 * @returns the active id, or `null` until one has been seen.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join('\u0000')

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the stable identity of `ids`; the array itself is a fresh literal each render.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-40% 0px -50% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el !== null) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [key])

  return active
}
