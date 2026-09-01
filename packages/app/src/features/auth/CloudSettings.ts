/**
 * Settings cloud sync, as pure rules — canon
 * `docs/Features/Preferences.md` § *Cloud sync* and
 * `Kro/Application/Main/MainSettingsSyncProducer.swift`.
 *
 * Three rules, and each one is here rather than inside the Service because each
 * is a *decision* the product makes, testable with no transport at all:
 *
 * 1. **When a pull may happen.** Canon is unusually emphatic: *"On sign-in and
 *    on app launch … **This is the only moment a pull overwrites local
 *    values** — chosen deliberately so a change made while offline isn't
 *    overwritten just because the user reopened Settings."* `MainFeature`
 *    enforces it with a comment on the Settings-open arm saying the hub *does
 *    not* pull. `shouldPullSettings` is that sentence as a function, so
 *    "opening Settings must not pull" is a test rather than a convention.
 * 2. **When a push happens.** On closing Settings — canon fires the same effect
 *    from *both* dismissal paths (the close button and the swipe-down) so the
 *    two cannot drift.
 * 3. **What travels.** `cloudSyncOptions` and nothing else, in **both**
 *    directions. Canon builds the push from that list and filters the pull
 *    against the same list, calling it defense in depth; the five device-only
 *    options (appearance, haptics, milestone haptics, keep-screen-awake, end
 *    sound) never leave the device (`SEC-1` data minimization, and the user's
 *    expectation stated in the spec).
 *
 * ## Last-write-wins is the *account's* clock, not the device's
 *
 * A pulled entry carries `updatedAt` from the server column, whose value the
 * `user_settings_set_updated_at` trigger owns — the client never writes it.
 * Where two entries for one key arrive together, the later one wins
 * (`latestCloudSettingPerKey`). With the table's `primary key (user_id, key)`
 * that cannot happen from a live server, so this is a defensive rule; it is
 * written down anyway because the *conflict policy* is a product decision the
 * spec states ("the most recent change wins, decided by the account's clock")
 * and a decision with no code has no test.
 *
 * A tie resolves to the **later entry in the list**, mirroring
 * `lastWriteWins`'s "cloud is authoritative" tie-break in `@kro/core`, so the
 * two conflict rules in this codebase break ties the same way.
 */
import {
  type Preferences,
  type SettingOption,
  type SettingValue,
  cloudSyncOptions,
} from '@kro/core'

/**
 * One preference as it travels to and from the account — the *domain* shape.
 * The `user_settings` row's `value`/`value_type` text encoding is the wire
 * shape and lives with the Service that speaks it.
 */
export interface CloudSettingEntry {
  /** The preference key, verbatim from canon — e.g. `general.weekStart`. */
  readonly key: string
  readonly value: SettingValue
  /** The account's clock for this key. `null` on a push (the server owns it). */
  readonly updatedAt: Date | null
}

/** Every moment sync can be asked about. A closed set, so `RC-9` can close it. */
export const SettingsSyncTrigger = {
  appLaunch: 'appLaunch',
  signIn: 'signIn',
  settingsOpened: 'settingsOpened',
  settingsClosed: 'settingsClosed',
} as const

export type SettingsSyncTrigger =
  (typeof SettingsSyncTrigger)[keyof typeof SettingsSyncTrigger]

export const settingsSyncTriggers: readonly SettingsSyncTrigger[] = [
  SettingsSyncTrigger.appLaunch,
  SettingsSyncTrigger.signIn,
  SettingsSyncTrigger.settingsOpened,
  SettingsSyncTrigger.settingsClosed,
]

/**
 * *"On sign-in and on app launch … This is the only moment a pull overwrites
 * local values."* Opening Settings is deliberately **not** one of them.
 */
export const shouldPullSettings = (trigger: SettingsSyncTrigger): boolean =>
  trigger === SettingsSyncTrigger.appLaunch ||
  trigger === SettingsSyncTrigger.signIn

/** *"On closing Settings, it sends the current synced values back."* */
export const shouldPushSettings = (trigger: SettingsSyncTrigger): boolean =>
  trigger === SettingsSyncTrigger.settingsClosed

/** The cloud-scoped option for a key, or `null` when the key is not one. */
export const cloudSyncOptionForKey = (key: string): SettingOption | null =>
  cloudSyncOptions.find((option) => option.key === key) ?? null

/**
 * The push payload — every cloud-scoped option that has a value.
 *
 * Canon `compactMap`s away options with no stored value, and so does this: an
 * option whose default is `null` and which the user never set has nothing to
 * say about their preference, and writing a row for it would make one device's
 * silence overwrite another device's answer.
 */
export const cloudSettingEntriesFrom = (
  preferences: Preferences,
): readonly CloudSettingEntry[] =>
  cloudSyncOptions.flatMap((option) => {
    const value = preferences.read(option)
    return value === null ? [] : [{ key: option.key, value, updatedAt: null }]
  })

/**
 * Collapse duplicate keys to the account's most recent write.
 *
 * An entry with no `updatedAt` loses to one that has it — an unstamped row
 * cannot claim to be more recent than a stamped one. Two unstamped entries fall
 * back to arrival order.
 */
export const latestCloudSettingPerKey = (
  entries: readonly CloudSettingEntry[],
): readonly CloudSettingEntry[] => {
  const byKey = new Map<string, CloudSettingEntry>()
  for (const entry of entries) {
    const held = byKey.get(entry.key)
    if (held === undefined) {
      byKey.set(entry.key, entry)
      continue
    }
    const heldAt = held.updatedAt?.getTime() ?? Number.NEGATIVE_INFINITY
    const entryAt = entry.updatedAt?.getTime() ?? Number.NEGATIVE_INFINITY
    // `>=` — a tie resolves to the later entry, the same way `lastWriteWins`
    // resolves a tie to the remote row.
    if (entryAt >= heldAt) byKey.set(entry.key, entry)
  }
  return [...byKey.values()]
}

/** What a pull did, so the caller can log it and a test can assert on it. */
export interface CloudSettingsApplication {
  /** The keys actually written locally. */
  readonly applied: readonly string[]
  /** Entries whose key is not cloud-scoped here — never written. */
  readonly ignoredKeys: readonly string[]
  /** Entries whose value did not fit their option's declared type. */
  readonly rejectedKeys: readonly string[]
}

/**
 * `applyPulledSettings` — writes pulled entries into local preferences.
 *
 * Remote wins on a pull; that is canon's whole conflict story for this
 * direction (*"Cloud is authoritative after a pull"*). Two guards keep the
 * overwrite honest, both of them canon's:
 *
 * - a key that is not a **cloud-scoped** option here is ignored, never written
 *   — so a row left by an older build, or by a platform that syncs one more
 *   key, cannot introduce a preference this client does not understand;
 * - a value whose primitive does not fit the option's declared type is
 *   rejected rather than coerced. `Preferences.write` already makes that
 *   decision (it returns `false` and stores nothing), so this reuses it instead
 *   of re-implementing the type table — one validation, not two that can drift.
 */
export const applyCloudSettingEntries = (
  entries: readonly CloudSettingEntry[],
  preferences: Preferences,
): CloudSettingsApplication => {
  const applied: string[] = []
  const ignoredKeys: string[] = []
  const rejectedKeys: string[] = []

  for (const entry of latestCloudSettingPerKey(entries)) {
    const option = cloudSyncOptionForKey(entry.key)
    if (option === null) {
      ignoredKeys.push(entry.key)
      continue
    }
    if (preferences.write(option, entry.value)) applied.push(entry.key)
    else rejectedKeys.push(entry.key)
  }

  return { applied, ignoredKeys, rejectedKeys }
}
