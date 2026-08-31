# 00 — Product Brief

## Vision

**Kro Web is Kro — the same personal execution system, on the web.** Not a companion, not a
read-only viewer, not a subset: feature, business-rule and UX parity with the Apple app, with
web-native equivalents wherever Apple ships first-party material.

## The binding product canon

> **`zheref/KroApple` at the latest tip of `main`.** `docs/Features/*.md` in that repo is the
> language-agnostic spec set — already shared canon with KroAndroid — and is the **binding**
> reference for every business rule, business decision and UX behaviour. Where a spec and the
> Swift code disagree, **the code is the tie-breaker**.

- **Pinned at epic-authoring time:** `zheref/KroApple@2c1ee45`.
- **Verified at the time this file was written (2026-08-30):** `origin/main` is *identical* to
  that pin — 0 ahead, 0 behind. No divergence to record yet.
- **Every child build re-fetches `origin/main` first** and re-reads the specs it cites. If canon
  has moved since the epic's pin, the child follows the **new tip** and names the divergence in
  its PR. A stale pin is never an excuse to ship the old behaviour.

The canon set as of the pin (19 files under `docs/Features/`):

`ActiveToast` · `DayProgressRings` · `DebugWindow` · `Do` · `EndeavorCard` · `EndeavorDetail` ·
`EndeavorsVista` · `Inbox` · `KroEnhanced` · `Notifications` · `OutlookCalendar` ·
`Performances` · `Plan` · `Preferences` · `Session` · `SourceReconciliation` · `Thirst` ·
`Triage` (+ `README`).

Design-system reference for the glass material: `zheref.io` (`main@b2cda9f`).

## Where we start from

kro-pwa today ships **one detached surface**: a single focus-session timer at `/session`. The
home page is still the `create-next-app` template; Settings and Integrations are stubs. The
monorepo, toolchain and UZF state tier landed in phase 0 (#2, #3, #5); everything a user would
call "Kro" is still ahead.

## Personas & jobs

One persona, deliberately: **the Kro user who is already using the Apple app and is now at a
desktop browser, or on a phone without the app installed.** The job is not "browse my tasks" —
it is *execute today*: see what is due, start a focus session, capture what just occurred to
you, triage the inbox, and be credited for what you finished.

A secondary job follows from the platform, not the persona: **be reachable where Apple is not**
— a Windows or Android desktop browser, a shared machine, a link opened from a message.

## Platform mapping (fixed)

| Viewport | Mirrors | Shell |
|---|---|---|
| Web **mobile** | iPhone | Flat tab bar — Plan · Do · Earn (+ Search affordance) |
| Web **desktop** | macOS | Sidebar shell, popover-first presentation, pointer-sized targets |

The mapping contract is KroApple's `KroUI/Do/DoSurfaceLayout.swift` idiom×width decision table,
ported as the responsive contract. This is a *contract*, not a guideline: the same content is a
sheet on mobile and a popover on desktop, at canonical sizes (Inbox 560×620, Visibility 460×560,
Profile w300, Do notifications 380×440 min).

## Success criteria (observable)

1. A user who knows the Apple app can complete Do, Plan, Session, Capture→Inbox→Triage and Earn
   on the web **without being taught anything new** — same information architecture, same
   interaction grammar, same vocabulary (including the macOS-only "Today"/"My Day"/"Jot
   Down"/"Execute"/"Adjust" naming on desktop).
2. Starting a 25-minute session, pausing, and reloading the page shows **wall-clock-correct**
   remaining time (anchored fragments, not ticks).
3. Feature flags default to `statusQuoSet`; a disabled destination renders a Thirst vote surface
   tagged with a web platform rather than a dead end.
4. Light/dark + accent theming passes **≥4.5:1** contrast regression tests; `prefers-reduced-motion`
   stops the rotating glow and the press waves.
5. `make setup && make lint && make typecheck && make test && make build` is green, `pr.yml` is
   green on a PR, and the guard hook rejects an untested new source file.

## Non-goals (v1)

- Features that are **OFF** in KroApple's `statusQuoSet` get their flag and a Thirst /
  coming-soon surface only, never an implementation: standalone Priority Matrix destination,
  Habits, Board, Blueprints, notifications-on-by-default, Outlook, `authenticationEnforced`,
  stopwatch/breaks/duration-learning beyond their flag-gated code paths. *(Plan's in-tab
  priority-matrix mode **is** shipped and **is** in scope.)*
- Apple EventKit hosts (Apple Calendar / Apple Reminders) — impossible on the web. Google
  Calendar is the flagship external host; reconciliation is built host-agnostic so these are
  additive later via Kro Cloud.
- Widgets, Live Activities, App Intents, CloudKit — KroApple has none. No menu-bar extra: the
  Session Pill and the document-title timer carry it.
- Streaks or stats beyond rings, the tomato counter and performances — canon explicitly has none.
- **Writing the Kro Cloud schema.** `supabase/migrations/` is canon only in KroApple. This repo
  is a client and wires no `db-migrate` caller.

## Constraints

- **Stack is locked** by Stack Matrix Scenario 5 (Web Only): pnpm + Turborepo, Next.js 15 App
  Router, Biome, Vitest, Tailwind v4 + shadcn/ui, Supabase. Not a per-child decision.
- **Architecture is canon**, not preference: `react-uzf-v1`, `RC-1`…`RC-63` (see
  [`architecture/web.md`](./architecture/web.md)).
- **Delivery is gated**: one issue → one PR, human merge at G2, ≤3 children in flight, every
  child declaring an exclusive file lane.

## Priority

**High.** The epic is the repo's whole current programme (34 children, #2–#35). Phase 0 is
serial; phase 1 onward parallelises by lane.
