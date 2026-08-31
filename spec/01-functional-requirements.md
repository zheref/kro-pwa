# 01 — Functional Requirements

Scope is **parity with KroApple's shipped behaviour** — the `statusQuoSet` feature-flag baseline
— plus the flag-gated machinery around it. Each requirement below names the child issue that
delivers it and the KroApple canon file that binds it. The canon file is authoritative for the
detail; this list exists so nothing is silently dropped, not to restate `docs/Features/`.

Phases match the epic's sequencing. Logic children land before their UI children; each child
declares an exclusive file lane.

---

## Phase 0 — Foundation (serial)

| # | Requirement | Status |
|---|---|---|
| #2 | pnpm + Turborepo monorepo: `apps/web`, `packages/core`, `packages/app` | ✅ merged |
| #3 | Toolchain: Biome, Vitest, lefthook + commitlint, guard hooks, `pr.yml` (CON-19 triggers) | ✅ merged |
| #4 | Bankai context & canon wiring: `spec/`, `CLAUDE.md`, canon-values, `.claude/rules/`, `bankai.yml` | ← this issue |
| #5 | UZF state tier: `makeStore(extra)`, `ThunkExtra`, `Result`/`Exception`, typed hooks | ✅ merged |
| #6 | Design system: Tailwind v4 + shadcn/ui, KroTokens, KroGlass, `indigoGrape` | blocked by #4 |

---

## Phase 1 — Domain (parallel by lane, after #5)

| # | Requirement | Canon |
|---|---|---|
| #7 | **Endeavor model** — kinds, statuses, hosts, tags, defers, performances, shadows, repeat config, and the kind-relevance matrix. Blocks #8 #9 #10 #12 | `EndeavorCard`, `EndeavorDetail` |
| #8 | **Session domain** — configs, fragments, anchored accounting, recommendation, points formulas (sliding scale 30 %/100 %/proportional, legacy formula selectable) | `Session`, `Performances` |
| #9 | **Vista system** — Query/Lens/Capabilities, the registry, versioned lens snapshots | `EndeavorsVista` |
| #10 | **Local persistence** — IndexedDB rows shaped like `EndeavorRecord` (soft delete + `lastSyncedAt`), `kro:`-namespaced prefs, the running-session anchor | `Session`, `Preferences` |
| #11 | **Settings schema + flag registry** — 28 flags, `statusQuoSet` defaults, debug overrides, per-key sync scope | `Preferences`, `DebugWindow` |
| #12 | **Source reconciliation & Kro-enhanced** — citizen / tourist / enhanced | `SourceReconciliation`, `KroEnhanced` |

---

## Phase 2 — Shell & shared UI

| # | Requirement |
|---|---|
| #13 | **Responsive app shell** — the `DoSurfaceLayout` idiom×width contract, tab bar ↔ sidebar, routes, providers. Blocks every feature UI child. Sole owner of `apps/web/src/app/**` |
| #14 | **Component kit I** — EndeavorCard/Row, chips, banners, empty states |
| #15 | **Component kit II** — FAB + menu + rotating glow, ActiveToast, DurationDial, ActivityRings, emoji picker |

---

## Phase 3 — Features (logic → UI pairs)

| # | Requirement | Canon |
|---|---|---|
| #16 / #17 | **Do / My Day** — lanes in canonical order (Suggestions → Reminders → Events → Now → Overdue → Due Soon → Expired → Next → Anytime → Completed Today); the Now hero lane holds an odd count with the top-scoring card centred and enlarged; rings exclude expired items and ignore visibility filters; the header counts "N left today" | `Do`, `DayProgressRings` |
| #18 / #19 / #20 | **Plan** — 60 px/hour timeline; hold-or-double-tap on empty canvas creates a dashed hour ghost snapped to the nearest quarter hour and opens the prompt pre-set to Event; hold on a block arms edit mode with start/end/body drags snapping to 15 min (min duration 15 min) and live reflow; past events read-only; list mode; in-tab priority-matrix mode | `Plan` |
| #21 / #22 | **Session** — sheet phases, pill, breaks; conclusion offers Complete Task / Start New / Break; an early finish below 30 % of target records an aborted attempt | `Session` |
| #23 / #24 | **Capture & Inbox** — capturing an Event routes to Plan (day selected, list mode, highlighted); Task/Reminder/Habit open the Inbox; "Add for Today" pre-fills the next 15-minute slot and shows an ~8 s Undo toast | `Inbox`, `ActiveToast` |
| #25 / #26 | **Triage** — value ≥3 auto-promotes to the Important row preserving urgency; increasing effort scales reward proportionally (decreasing never does); a scheduled date always implies an expiry; Confirm requires quadrant + date (Archive exempt); quadrant assignment resolves due/value exactly per `PlanMatrixResolution` | `Triage` |
| #27 / #28 | **Earn** — reward points, tomato counter, performances, Earn preferences (incl. the legacy points formula switch) | `Performances` |
| #29 / #30 | **Find / Tasks / Detail** — search, All Tasks, Endeavor Detail/Edit + relations | `EndeavorDetail`, `EndeavorsVista` |
| #31 | **Auth & cloud sync** — Supabase Auth (email/password, Apple OIDC, Google); flag-gated sync per canon; signing out clears device-stored preferences and pending notification alerts | `Preferences` |
| #32 | **Auth + Settings UI** — the settings hub and sections, mirroring `SettingOptions` including per-key sync scope | `Preferences` |
| #33 | **Google Calendar integration** — the flagship external host | `SourceReconciliation` |
| #34 | **PWA platform services** — notifications (flag-gated, reconciliation model), sounds, wake lock, install, offline resilience | `Notifications` |
| #35 | **Thirst & coming-soon surfaces** — vote surfaces for gated destinations with a web `VotePlatform` tag; unmapped dead-ends show a plain card with no vote affordance | `Thirst` |

---

## Cross-cutting requirements

- **Every external system is a Service behind `ThunkExtra`** with a `stubbed…` twin and a
  fixture (`RC-33`) — including notifications, sounds, wake lock, storage and calendar.
- **Every flag-gated destination** renders either its feature or a Thirst vote surface; never a
  blank route.
- **No requirement is met by a component fetching.** Effects are built only by Producers
  (`RC-3`); the boundary is enforced by `packages/app/scripts/check-uzf-boundaries.mjs`.
- **Given/When/Then detail lives in KroApple's `docs/Features/*.md`.** Restating it here would
  fork canon; each child's issue quotes the acceptance criteria it is held to.
