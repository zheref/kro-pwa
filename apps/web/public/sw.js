/*
 * Kro's service worker.
 *
 * Three jobs, in the order they matter:
 *
 *   1. Display a pushed notification.
 *   2. Open the app when one is clicked — **at this worker's own origin**.
 *   3. Keep the app shell loadable offline.
 *
 * Rebuilt for KC-IS-#34. The seed this replaces carried two defects reported on
 * KC-PR-#37's Copilot round and routed here:
 *
 *   - `clients.openWindow('<https://kro.app>')` — the angle brackets were
 *     literal characters in the URL, so every notification click failed to
 *     navigate. Worse, the URL was hardcoded to a domain this deployment may
 *     not be on; a worker only ever controls its own origin, so the origin is
 *     now read from `self.registration.scope` and never written down.
 *   - `icon: '/icon.png'` and `badge: '/badge.png'` — neither file exists. The
 *     real icons are `/icons/Kro192.png` and `/icons/Kro512.png`. A missing
 *     icon degrades to the browser's default silently, which is exactly why it
 *     survived unnoticed.
 *
 * ## Caching strategy — what IS and what is NOT cached
 *
 * CACHED (cache-first, immutable by construction):
 *   · `/_next/static/**`  — content-hashed build output; a new build produces
 *                           new URLs, so a stale entry can never be served for
 *                           changed code.
 *   · `/icons/**`, `/sounds/**` — bundled assets that change only with a deploy.
 *
 * CACHED (network-first, cache as fallback):
 *   · navigations — the offline load falls back to the precached app shell at
 *     `/`, so a cold offline start reaches a working document rather than the
 *     browser's dinosaur.
 *
 * NOT CACHED, EVER:
 *   · anything that is not a same-origin `GET` — a `POST` to a Server Action,
 *     a cross-origin request, a Range request.
 *   · `/api/**` — auth callbacks and Google Calendar proxying. Caching an
 *     authenticated response in a shared origin cache is how one account's data
 *     ends up in front of the next (SEC-8 / CWE-668).
 *   · the user's own data. It lives in **IndexedDB** (KC-IS-#10's local store)
 *     and is already available offline; duplicating it into the HTTP cache
 *     would create a second, stale copy with no sync rules.
 *
 * The cache name carries a version. Bumping `CACHE_VERSION` is what evicts the
 * previous generation: `activate` deletes every cache whose name is not the
 * current one.
 */

const CACHE_VERSION = 'kro-shell-v1'

/**
 * The minimum set that makes a cold offline start work: the shell document and
 * the icons a notification or the installed app chrome may need.
 *
 * Precached one by one rather than with `cache.addAll`, which rejects the whole
 * install if a single entry 404s — one missing icon must not leave the app with
 * no worker at all.
 */
const APP_SHELL = ['/', '/icons/Kro192.png', '/icons/Kro512.png']

/** Prefixes served cache-first. Everything here is immutable per deploy. */
const IMMUTABLE_PREFIXES = ['/_next/static/', '/icons/', '/sounds/']

/** Prefixes that must never be cached, whatever else matches. */
const NEVER_CACHE_PREFIXES = ['/api/']

const NOTIFICATION_ICON = '/icons/Kro192.png'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)
      await Promise.allSettled(APP_SHELL.map((path) => cache.add(path)))
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('kro-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

/**
 * `skipWaiting` is deliberately **not** called on install: replacing the worker
 * under a page that is already running risks serving it chunks from a different
 * build. The page asks for the swap when it is ready to reload.
 */
self.addEventListener('message', (event) => {
  if (event.data === 'kro:skip-waiting') self.skipWaiting()
})

const isImmutable = (pathname) =>
  IMMUTABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix))

const isNeverCached = (pathname) =>
  NEVER_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix))

/** Cache-first: the asset cannot change without changing its URL. */
const cacheFirst = async (request) => {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION)
    await cache.put(request, response.clone())
  }
  return response
}

/** Network-first with the precached shell as the offline fallback. */
const networkFirstDocument = async (request) => {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      // Keyed by the request: caching every navigation under '/' would let
      // any route's HTML overwrite the shell, so an offline start at '/'
      // could render the wrong route.
      await cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const lastKnown = await caches.match(request)
    if (lastKnown) return lastKnown
    const shell = await caches.match('/')
    if (shell) return shell
    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isNeverCached(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstDocument(request))
    return
  }

  if (isImmutable(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
})

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    // A push that is not JSON is not ours; showing "[object Object]" would be
    // worse than showing nothing.
    return
  }

  const title = typeof payload.title === 'string' ? payload.title : 'Kro'
  const options = {
    body: typeof payload.body === 'string' ? payload.body : '',
    icon: typeof payload.icon === 'string' ? payload.icon : NOTIFICATION_ICON,
    // `tag` is what makes one alert per item true at the OS level: a second
    // push under the same tag replaces the first instead of stacking.
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    data: { receivedAt: Date.now() },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // The app's own origin, read from the registration rather than written down:
  // a worker only ever controls the origin it was registered on, so this is
  // correct on localhost, on a preview deployment and in production alike.
  const appUrl = new URL(self.registration.scope)

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Prefer focusing a tab that is already open — opening a second one is
      // the classic notification-click annoyance.
      for (const client of windows) {
        if (new URL(client.url).origin === appUrl.origin) {
          await client.focus()
          return
        }
      }

      await self.clients.openWindow(appUrl.href)
    })(),
  )
})
