# 02 — Non-Functional Requirements

Baselines that bind every child, whatever it builds. Where a number is not yet decided this file
says so plainly rather than inventing one — an unmeasured budget is worse than an absent one,
because it reads as agreed.

## Accessibility — binding

Canon: `bankai-core` `handbooks/ux-baseline.md` (`UX-{n}`), mirrored in review by Bisky.

- **Contrast ≥ 4.5:1** for text and meaningful icons, in light and dark, at every accent —
  regression-tested, not eyeballed (epic AC 9).
- **Target sizes:** ≥44 px on mobile with ≥8 px separation; ≥28 px on desktop with ≥4 px. This
  is the idiom rule, not a preference.
- **Never colour alone.** Every coloured signal pairs with an icon **and** text.
- **`prefers-reduced-motion`** stops the rotating glow and the press/block waves. Motion is an
  enhancement; the surface must be complete without it.
- **Disabled controls say what blocks them** — a submit button that is off explains why.
- Keyboard reachability and visible focus on every interactive element; the desktop shell is
  fully operable without a pointer.
- Disabled opacity `0.62`, applied exactly once per control (never compounded by nesting).

## Performance

- **Core Web Vitals are the shape of the budget** (LCP / INP / CLS). **Concrete thresholds are
  not yet set** — they are set by the design-system child (#6) once real surfaces exist to
  measure, and recorded here at that point. No child may claim a performance result against a
  budget that does not exist.
- **The session timer is accounted, not ticked.** Elapsed time derives from anchored fragments
  against the wall clock, so a backgrounded tab, a throttled timer or a reload cannot drift it
  (epic AC 4). This is a correctness requirement that happens to look like a performance one.
- The Plan timeline renders a 60 px/hour grid with drag interactions snapping to 15 minutes; it
  must stay interactive across a full day's blocks.
- Bundle size is observable via `make analyze` (`ANALYZE=true next build`). No budget is
  enforced in CI today.

## Offline & resilience

- **Local-first.** IndexedDB rows shaped like `EndeavorRecord` (soft delete + `lastSyncedAt`)
  and `kro:`-namespaced preferences are the working set; the network is an enhancement.
- A reload mid-session restores wall-clock-correct state from the persisted anchor.
- Cloud sync is flag-gated per canon; with it off, the app is fully usable.
- Installable PWA with a service worker; offline behaviour is specified by #34.

## Privacy & security

Canon: `bankai-core` `handbooks/security-baseline.md` (`SEC-{n}`), reviewed by Tenma.

- **No secret in the repo.** Credentials are read from the environment; the pre-commit guard
  (`.bankai/hooks/guard.sh`) refuses a staged hardcoded credential, and `--no-verify` is never
  acceptable (`SEC-14`).
- **Authorisation at the data layer.** Kro Cloud access is governed by Supabase RLS (`SEC-6`) —
  the client is never the authority. The schema itself is KroApple-owned; this repo writes no
  migrations.
- **Every boundary is parsed, not cast** (`SEC-7`): wire data enters through a `Response` type
  and a Mapper, never straight into `State` (`RC-29`, `RC-30`).
- **No PII in logs or analytics.** There is no analytics: KroApple ships none, and Thirst vote
  counts are the only demand signal.
- Third-party GitHub Actions are pinned to a reviewed commit SHA (`SEC-14`) — see `pr.yml`.

## Browser & platform support

- Evergreen Chromium, Firefox and Safari; iOS Safari and Android Chrome for the mobile shell.
- **Safari's `backdrop-filter` constraint is binding**: never put `backdrop-filter` on a
  `position: fixed` element — carry it on an inner pseudo-element. This is the documented fix
  from the `zheref.io` glass recipe and is a correctness rule, not a style note.
- No IE/legacy support. No native app shell.

## Internationalisation

Not in scope for v1. Copy is English, authored once in the domain tier (exception copy is
derived per `kind`, never assembled in a view), which is the seam a future i18n pass would use.

## Observability

No telemetry, no crash reporting, no analytics — matching canon. Failures surface to the user
through the typed `…Exception` union with a `recoverable` flag driving the retry affordance.
