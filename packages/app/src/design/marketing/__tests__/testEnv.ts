/**
 * Browser APIs jsdom does not ship, as controllable fakes — shared by the
 * marketing suites. Each installer returns what a test needs to drive it.
 */
import { vi } from 'vitest'

export interface FakeObserver {
  readonly callback: IntersectionObserverCallback
  readonly options: IntersectionObserverInit | undefined
  readonly observed: Element[]
  disconnected: boolean
  fire(entries: Array<{ target: Element; isIntersecting: boolean }>): void
}

/** Replace `IntersectionObserver` with a recorder. */
export function installFakeObserver(): FakeObserver[] {
  const instances: FakeObserver[] = []
  class Fake {
    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      const record: FakeObserver = {
        callback,
        options,
        observed: [],
        disconnected: false,
        fire: (entries) =>
          callback(
            entries as unknown as IntersectionObserverEntry[],
            this as unknown as IntersectionObserver,
          ),
      }
      instances.push(record)
      this.record = record
    }
    record: FakeObserver
    observe(el: Element) {
      this.record.observed.push(el)
    }
    unobserve() {}
    disconnect() {
      this.record.disconnected = true
    }
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('IntersectionObserver', Fake)
  return instances
}

/** Make `matchMedia('(prefers-reduced-motion: reduce)')` answer `reduce`. */
export function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  )
}

/** Pretend every element's top edge is at `top` px. */
export function stubElementTop(top: number): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  })
}
