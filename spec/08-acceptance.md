# 08 — Acceptance & Test Plan

Two halves: **what "done" means for the programme** (the epic's acceptance criteria, restated
here so a child can be traced to one) and **what "done" means for a single PR** (the per-artifact
minimums, the coverage floor, and the edge cases every agent must cover).

## Programme acceptance (epic #1)

Each criterion is observable — a reviewer can run it, not just agree with it.

1. **Shell.** At phone width: the Plan · Do · Earn tab bar (+ Search affordance). At desktop
   width: a sidebar with My Day / All Tasks, a Workflow section, a bottom Settings section and a
   Lists section — matching KroApple's iPhone tab bar and macOS sidebar respectively, including
   the macOS-only "Today" / "My Day" / "Jot Down" / "Execute" / "Adjust" naming.
2. **Do.** Lanes in canonical order (Suggestions → Reminders → Events → Now → Overdue → Due Soon
   → Expired → Next → Anytime → Completed Today); the Now hero lane holds an odd count with the
   top-scoring card centred and enlarged; rings exclude expired items and are unaffected by
   visibility filters; the header counts "N left today".
3. **Plan.** A 60 px/hour grid; hold-or-double-tap on empty canvas creates a dashed hour ghost
   snapped to the nearest quarter hour and opens the prompt pre-set to Event; hold on a block
   arms edit mode with start/end/body drags snapping to 15 min (min duration 15 min) and live
   reflow; past events are read-only.
4. **Session.** Start 25 minutes, pause, reload the page → wall-clock-correct remaining time.
   Conclusion offers Complete Task / Start New / Break. An early finish below 30 % of target
   records an aborted attempt. Points follow the sliding-scale formula (30 % / 100 % /
   proportional), with the legacy formula selectable in Earn preferences.
5. **Capture.** An Event routes to Plan (day selected, list mode, highlighted); Task / Reminder /
   Habit open the Inbox; "Add for Today" pre-fills the next 15-minute slot and shows an ~8 s Undo
   toast.
6. **Triage.** Value ≥3 auto-promotes to the Important row (preserving urgency); increasing
   effort scales reward proportionally (decreasing never does); a scheduled date always implies
   an expiry; Confirm requires quadrant + date (Archive exempt); quadrant assignment resolves
   due/value exactly per `PlanMatrixResolution`.
7. **Settings.** Mirror KroApple's `SettingOptions` schema including per-key sync scope; signing
   out clears device-stored preferences and pending notification alerts.
8. **Flags.** Default to `statusQuoSet`; disabled destinations render Thirst vote surfaces tagged
   with a web platform; unmapped dead-ends show a plain card with no vote affordance.
9. **Theming.** Light/dark + accent pass ≥4.5:1 contrast regression tests; glass surfaces follow
   the `zheref.io` recipe; `prefers-reduced-motion` stops the rotating glow and press waves.
10. **Toolchain.** `make setup && make lint && make typecheck && make test && make build` green;
    `pr.yml` green on a PR; `bankai-scf doctor` exits 0; the guard hook rejects an untested new
    source file.

## Per-PR acceptance — the definition of done

A PR is done when **all** of the following hold. This is the same list `CLAUDE.md` carries, and
the same list a reviewer checks.

- `make lint`, `make typecheck`, `make test` and `make build` are green **locally**, not just in
  CI.
- Every new artifact carries its minimum (table below), and every touched file is at **≥80 %**
  line coverage — with exemptions named in the PR body (`RC-57`: passive Server Page / Client
  Wrapper shells; generated code; mock/DI files).
- The PR body carries `# What this changes for you` (effect before mechanism, costs stated) and
  `## How to verify` (numbered steps with exact expected results) — `CON-17`.
- It cites its issue (`Closes #N`, or `Part of #N` for partial work) and stays inside that
  issue's declared file lane.
- No new `any`; no `@ts-ignore`; a `@ts-expect-error` or `biome-ignore` carries its reason on the
  same line; nothing was committed with `--no-verify`.

## Per-artifact minimums (`UZF-18`, `RC-12`, `RC-54`…`RC-57`)

| Artifact | Tests required |
|---|---|
| Reducer action (sync `reducers` case) | ≥3 — typical / boundary / no-op — called directly against the slice reducer |
| Reducer arm for a thunk lifecycle | ≥3 — happy / failure / edge — driven through the real thunk against a stubbed Service |
| Selector | ≥3 — typical / edge / empty — against a hand-built root-state slice |
| Shifter | ≥3 — typical / boundary / no-op — pure |
| Producer | ≥3 — using the `stubbed…Service` injected via `extra`, never a mocked `fetch` |
| Mapper | ≥3 each for `toDomain` / `fromDomain` / `toException` |
| Page / Fragment | ≥3 Storybook stories **and** ≥3 mirroring RTL render tests, both from the same `<F>Mocks` |
| Route handler / Server Action | ≥3 — asserting on the returned `Result` |
| Domain model | ≥7 mock variants in `__mocks__/<Model>.mocks.ts` (3 convenient / 1 neutral / 3 inconvenient) |
| Server Page / Client Wrapper | **exempt** — passive shells |

## Edge cases every agent must cover

These are the ones that have a habit of being skipped:

- **Cancellation is not a failure.** An aborted dispatch (unmount, or a newer input superseding
  the request) must exit silently and paint no exception. Test the abort path explicitly.
- **Reload mid-session.** Wall-clock-correct restoration from anchored fragments — not "close
  enough".
- **Empty and error states** for every surface, not just the happy path.
- **Expired vs. overdue** are different states in Do and in the rings.
- **A decreasing effort must not scale reward** in Triage — the asymmetry is the rule.
- **Reduced motion** and **dark mode** are separate render paths; a story exists for each.
- **Offline**: the app is fully usable with sync off and with the network down.
- **Tests never reach the network** (`RC-35`) and never construct `State` inline (`RC-31`).

## E2E

Playwright, via `make test-e2e` (installs Chromium first). One smoke test exists today
(`apps/web/e2e/session.smoke.spec.ts`) and `pr.yml` deliberately does **not** run it yet — the
browser download is not justified by one test. The child that adds real E2E coverage adds the CI
step and the cache with it, and says so in its PR.
