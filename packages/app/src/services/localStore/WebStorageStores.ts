/**
 * The two stores that are **not** IndexedDB: `localStorage`-backed preference
 * storage and the running-session anchor.
 *
 * ## Why `localStorage` for these two, and IndexedDB for everything else
 *
 * **Preferences must be synchronous.** KC-IS-#11's `KeyValueStore` is a `RC-47`
 * Provider-shaped port precisely because a reducer and a Selector may read it
 * directly, and neither can await. IndexedDB has no synchronous API at all, so
 * an IndexedDB-backed preference store would have to be a hydrated in-memory
 * cache with an async warm-up — real complexity, a real "not loaded yet" state
 * to design around, in exchange for storing a few dozen scalars. `localStorage`
 * is synchronous, origin-scoped and durable, which is exactly the `UserDefaults`
 * shape canon uses.
 *
 * **The anchor is one document, written on phase transitions only.** Canon
 * persists it with `@Shared(.fileStorage(PersistedRunningSession.fileURL))` —
 * `Documents/runningSession.json`, a single file replaced whole. The web has no
 * file, and the contract canon's header states is not "a file": it is *one
 * document*, *replaced whole*, *written only on start / pause / resume / finish
 * / abort*. A single `localStorage` key satisfies all three exactly, and does so
 * more faithfully than an IndexedDB row would, because a `localStorage` write
 * **is** atomic whole-value replacement — there is no partial-update API to
 * misuse and therefore no way for a caller to start writing on every display
 * tick, which is the failure canon's comment exists to prevent.
 *
 * The cost is honest and small: `localStorage` is ~5 MB per origin and the
 * anchor is a few hundred bytes; it is synchronous, and the anchor is written a
 * handful of times per session, not per frame. Both are stated so the choice
 * can be argued with rather than discovered.
 *
 * ## Absent storage is not an error
 *
 * `localStorage` throws on access in some privacy modes and is simply absent in
 * a non-browser runtime (an SSR pass, a Node test). Both stores therefore take
 * their `Storage` as an argument and the live factory resolves it defensively:
 * where there is none, the caller gets an in-memory `Storage` and the app keeps
 * working for the current tab. Failing to construct would take the whole app
 * down over a preference.
 */
import {
  type PersistedRunningSession,
  type KeyValueStore,
  type SettingValue,
  RUNNING_SESSION_ANCHOR_KEY,
  type RunningSessionAnchorStore,
  decodeRunningSessionAnchor,
  encodeRunningSessionAnchor,
} from '@kro/core'

/**
 * The `Storage` surface these two stores use — the four members of the DOM's
 * `Storage` they actually call, so a test double is four methods rather than a
 * full `Storage` stub.
 */
export interface WebStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length: number
  key(index: number): string | null
}

/** A `Storage`-shaped object over a `Map`, for a runtime that has none. */
export const makeMemoryWebStorage = (
  seed: Readonly<Record<string, string>> = {},
): WebStorageLike => {
  const entries = new Map<string, string>(Object.entries(seed))
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
    removeItem: (key) => {
      entries.delete(key)
    },
    get length() {
      return entries.size
    },
    key: (index) => [...entries.keys()][index] ?? null,
  }
}

/** The key the write probe uses. Namespaced so it reads as ours in devtools. */
export const WEB_STORAGE_PROBE_KEY = '__kro_storage_probe__'

/**
 * Whether `storage` can actually be **written** to.
 *
 * A read-only check would not answer this: the failure mode worth detecting is
 * a `localStorage` that exists and whose `setItem` throws — historically
 * Safari's private mode with a zero quota, and any browser with DOM storage
 * disabled. So the probe writes.
 *
 * **It is non-destructive.** An earlier cut wrote the probe key and then
 * unconditionally removed it, which would silently delete a pre-existing value
 * under that key — from an older build, another script on the origin, or a
 * second Kro build sharing it — as a side effect of merely *constructing* the
 * store. The prior value is now captured first and put back: removed only if
 * the key was genuinely absent, restored verbatim if it was not. JavaScript is
 * single-threaded, so nothing can observe the intermediate state.
 *
 * Exported because that property is worth a test of its own, and the global
 * `localStorage` is awkward to seed.
 */
export const probeWebStorage = (storage: WebStorageLike): boolean => {
  try {
    const previous = storage.getItem(WEB_STORAGE_PROBE_KEY)
    storage.setItem(WEB_STORAGE_PROBE_KEY, '1')
    if (previous === null) storage.removeItem(WEB_STORAGE_PROBE_KEY)
    else storage.setItem(WEB_STORAGE_PROBE_KEY, previous)
    return true
  } catch {
    return false
  }
}

/**
 * Resolve the browser's `localStorage`, or an in-memory stand-in when there is
 * none (SSR, a privacy mode that throws on access).
 *
 * The `try` is not defensive dressing: Safari in Lockdown Mode and Firefox with
 * DOM storage disabled **throw** on the property access itself, before any
 * method is called, so `typeof localStorage` alone is not enough.
 */
export const resolveWebStorage = (): WebStorageLike => {
  try {
    if (typeof localStorage === 'undefined') return makeMemoryWebStorage()
    return probeWebStorage(localStorage) ? localStorage : makeMemoryWebStorage()
  } catch {
    return makeMemoryWebStorage()
  }
}

/**
 * The stored form of a preference value.
 *
 * `localStorage` holds strings only, and the port's value type is
 * `boolean | string | number` — so the type has to survive the round trip. It
 * is carried as JSON: `true` stores as `"true"`, `25` as `"25"`, and the string
 * `"25"` as `"\"25\""`, which is what keeps a user's string setting from coming
 * back as a number. A bare `String(value)` would lose that distinction, and the
 * loss would surface as a setting that silently changes type on reload.
 */
const encodePreference = (value: SettingValue): string => JSON.stringify(value)

/**
 * The inverse. **Never answers `null`** — a present key must not read as an
 * absent one.
 *
 * `KeyValueStore.get` uses `null` to mean *unset*, so returning it for a key
 * that is set would make a stored value indistinguishable from a missing one:
 * the caller falls back to the option's default and the next write silently
 * overwrites whatever was really there. That is a lost preference, from a read.
 *
 * There are exactly two ways a stored string is not one of this port's three
 * scalars, and both take the same route — read it loosely as the string it is:
 *
 * - **Unparseable** — written by an older, un-encoded build, or by another
 *   script sharing the origin.
 * - **Valid JSON, but not a scalar** — `"null"`, `"{}"`, `"[]"`. `SettingValue`
 *   has no member that can hold any of them, so the raw text is the only
 *   representation that keeps the key's *presence* true.
 */
const decodePreference = (raw: string): SettingValue => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'string' ||
      typeof parsed === 'number' ||
      typeof parsed === 'boolean'
    ) {
      return parsed
    }
    return raw
  } catch {
    return raw
  }
}

/** The live `KeyValueStore` — synchronous, over `localStorage`. */
export const makeWebPreferenceStorage = (
  storage: WebStorageLike = resolveWebStorage(),
): KeyValueStore => ({
  get: (key) => {
    const raw = storage.getItem(key)
    return raw === null ? null : decodePreference(raw)
  },
  set: (key, value) => {
    storage.setItem(key, encodePreference(value))
  },
  remove: (key) => {
    storage.removeItem(key)
  },
  /**
   * Every key in the origin's storage — **not** only Kro's.
   *
   * That is deliberate and is what the port's contract asks for: the wipe is a
   * prefix predicate over the keys that are actually there, so it can remove a
   * `kro:` key written by an older build whose option no longer exists. Scoping
   * `keys()` to a prefix here would move that decision into the binding, where
   * neither namespace's owner can see it.
   */
  keys: () => {
    const found: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key !== null) found.push(key)
    }
    return found
  },
})

/**
 * The live running-session anchor — one `localStorage` key, replaced whole.
 *
 * The port is async (every other store is), the binding is not; that mismatch
 * is fine and deliberate. Making the *port* synchronous would bind every future
 * implementation to a synchronous medium, and the anchor is read once at launch
 * from a Producer, which awaits anyway.
 */
export const makeWebRunningSessionAnchorStore = (
  storage: WebStorageLike = resolveWebStorage(),
  key: string = RUNNING_SESSION_ANCHOR_KEY,
): RunningSessionAnchorStore => ({
  read: async () => {
    const raw = storage.getItem(key)
    if (raw === null) return null
    try {
      return decodeRunningSessionAnchor(JSON.parse(raw) as unknown)
    } catch {
      // Unparseable is the same as corrupt: "no session", never a throw. See
      // `decodeRunningSessionAnchor` for why a plausible wrong number is worse.
      return null
    }
  },

  write: async (session: PersistedRunningSession) => {
    storage.setItem(key, JSON.stringify(encodeRunningSessionAnchor(session)))
  },

  clear: async () => {
    storage.removeItem(key)
  },
})
