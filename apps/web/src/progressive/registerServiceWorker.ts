/**
 * Registers `public/sw.js`.
 *
 * Registration is a **shell** concern, not a feature one: the worker is what
 * makes the app installable at all (Chromium requires a registered worker with
 * a fetch handler) and what serves the offline shell, both of which are true
 * before any feature has rendered. So it lives here, in `apps/web`, next to the
 * worker it registers — and not inside a Service behind `ThunkExtra`, which
 * would tie a document-wide capability to the lifetime of a store.
 *
 * **Wiring.** The composition root calls this once, from a client component,
 * on mount:
 *
 * ```text
 * useEffect(() => { void registerAppServiceWorker() }, [])
 * ```
 *
 * That root is `apps/web/src/app/**` — the shell child's (KC-IS-#13) exclusive
 * file lane, which this issue may not edit. So the function is shipped and
 * tested here and the one-line call is named as the wiring point in the PR;
 * until it lands, offline caching and installability are inert. That is a
 * deliberate lane boundary, not an oversight, and it is the reason the
 * Lighthouse installability check in "How to verify" is a manual step rather
 * than a claim.
 *
 * Everything about this function is defensive on purpose. Service workers are
 * unavailable in a lot of ordinary situations — a private window, an insecure
 * origin, a browser with the feature disabled, a server render — and none of
 * them is an error worth surfacing: the app works without one, just without
 * offline support.
 */

/** Where the worker lives, and the scope it controls. */
export const SERVICE_WORKER_PATH = '/sw.js'
export const SERVICE_WORKER_SCOPE = '/'

/** The narrow surface this module needs, so a suite can supply its own. */
export interface ServiceWorkerContainerLike {
  register(
    scriptUrl: string,
    options?: { scope?: string; updateViaCache?: 'none' | 'all' | 'imports' },
  ): Promise<ServiceWorkerRegistration>
}

export interface RegisterServiceWorkerOptions {
  readonly container?: ServiceWorkerContainerLike | null
  readonly log?: (message: string, reason: unknown) => void
}

const defaultContainer = (): ServiceWorkerContainerLike | null => {
  if (typeof navigator === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker
}

const defaultLog = (message: string, reason: unknown): void => {
  // A failed registration costs offline support and nothing else, so it is
  // logged rather than surfaced. Injectable (`options.log`) so a suite asserts
  // on it instead of on the console.
  console.warn(message, reason)
}

/**
 * Registers the worker, or resolves `null` where it cannot be registered.
 *
 * `updateViaCache: 'none'` stops the browser serving `sw.js` itself from the
 * HTTP cache, which is how a worker gets stuck a deploy behind.
 */
export const registerAppServiceWorker = async (
  options: RegisterServiceWorkerOptions = {},
): Promise<ServiceWorkerRegistration | null> => {
  const container =
    options.container === undefined ? defaultContainer() : options.container
  if (!container) return null

  try {
    return await container.register(SERVICE_WORKER_PATH, {
      scope: SERVICE_WORKER_SCOPE,
      updateViaCache: 'none',
    })
  } catch (reason) {
    ;(options.log ?? defaultLog)(
      'Kro: the service worker could not be registered; the app will run without offline support.',
      reason,
    )
    return null
  }
}
