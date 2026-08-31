# 04 — Data Model

The domain shape is **KroApple's**, not this repo's. `docs/Features/*.md` plus the Swift models
at `zheref/KroApple@main` are canon; this file records the entities web must carry, where they
live in the three-package split, and who owns the persisted schema.

## Ownership boundary — read this first

| Layer | Owner | This repo's role |
|---|---|---|
| **Kro Cloud schema** (Supabase, `supabase/migrations/`) | `zheref/KroApple` | **Client only.** kro-pwa authors no migration and wires no `db-migrate` caller. |
| **Local persistence** (IndexedDB, `kro:` prefs) | this repo (#10) | Owner — shaped to mirror `EndeavorRecord` so sync is a field mapping, not a translation. |
| **Domain types** | `@kro/core` | Owner of the TypeScript expression of canon's model. |

A change to the cloud schema is a KroApple change. Discovering that web needs a column is a
KroApple issue, not a local workaround.

## Entities (delivered by #7 unless noted)

| Entity | Carries | Notes |
|---|---|---|
| **Endeavor** | kind, status, host, tags, defers, performances, shadows, repeat config | The centre of the model. The **kind-relevance matrix** decides which fields are meaningful per kind — it is canon, not a UI convenience. |
| **EndeavorRecord** | the persisted row: soft delete + `lastSyncedAt` bookkeeping | #10. Shaped like KroApple's so reconciliation is field-for-field. |
| **Session** | configs, fragments, target, anchors | #8. See "anchored accounting" below. |
| **SessionFragment** | a start/stop pair against the wall clock | Already present in `packages/core/src/model/Session/`. |
| **Performance** | a recorded completion and its reward | #8/#27. Points follow the sliding-scale formula (30 % / 100 % / proportional), with the legacy formula selectable in Earn preferences. |
| **Vista** | Query + Lens + Capabilities, versioned lens snapshots | #9. The registry is canon (`EndeavorsVista`). |
| **Source** | citizen / tourist / Kro-enhanced | #12. Reconciliation is host-agnostic so new hosts are additive. |
| **Settings** | the `SettingOptions` schema **including per-key sync scope** | #11. Sync scope is part of the key's definition, not a separate table. |
| **FeatureFlag** | 28 flags with `statusQuoSet` defaults + debug overrides | #11, `featureFlags.ts` in `@kro/core`. |
| **Thirst vote** | a demand signal for a gated destination, tagged with a web `VotePlatform` | #35. The only telemetry-shaped thing in the product. |

## Anchored accounting (the one rule worth restating)

A session's elapsed time is **derived from anchored fragments against the wall clock**, never
accumulated from timer ticks. A backgrounded tab, a throttled `setInterval` or a page reload
must not change the answer. This is why `Session` persists anchors rather than a countdown, and
it is directly testable: start 25 minutes, pause, reload, assert the remaining time.

## Type shapes (`RC-28`, `RC-29`, `RC-30`)

- **Model** — domain types only, one type per file, no wire-format field names, no serialization
  concerns. `Date` is a legitimate `State` value here (the store's `serializableCheck` is
  widened for exactly that, and nothing else).
- **Response** — mirrors the wire format exactly, `snake_case` and all. Never imported outside
  the Service → Producer → Mapper path.
- **Mapper** — a plain object of pure functions (`toDomain` / `fromDomain` / `toException`); the
  only place wire ↔ domain ↔ exception conversion happens.
- **Exception** — a closed discriminated union with an `<X>Exceptions` factory. Never a raw
  `string` or `Error` in `State` or a completion event.
- **Mocks** — every domain model ships **≥7** variants in `__mocks__/<Model>.mocks.ts`
  (3 convenient / 1 neutral / 3 inconvenient), exported under the `@kro/core/mocks` subpath so
  production bundles never pull them (`RC-13`).

## What exists today

`packages/core/src/models/` carries the `Greeting` scaffolding set (Model, Response, Exception,
Mapper, `__mocks__`) as the reference shape a domain child copies, and
`packages/core/src/model/Session/` carries `SessionConfig` / `SessionFragment` / `SessionTypes`
from the pre-parity timer. Everything in the table above is still ahead.
