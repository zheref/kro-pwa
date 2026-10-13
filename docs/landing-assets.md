# Landing assets

Screenshots for the Kro landing page, under `apps/web/public/landing/`. Typed catalog:
`packages/app/src/features/landing/LandingAssets.ts`. Its test reads each file's WebP header and
checks the pixel size against the catalog, and checks that a landing section uses every key. This
note lives in `docs/` and not in `public/`, because everything under `public/` is served.

**Mock-only guarantee.** Every image is a render of mock fixtures: a Storybook story of this web app or
a recorded snapshot golden of the Kro apps (which render fixtures, never user data). Nothing was
captured from a real account. Nothing was copied from any signing/artifacts folder.

**WebP only.** Each image ships as a single `.webp` (quality 82, via sharp); no PNG master is committed
or served. The unused captures were purged: a key returns to the catalog together with the section that
uses it. Pixel sizes below are the WebP sizes.

## web/ — this repo's Storybook (`apps/web/e2e-kit/landing-captures.spec.ts`)

Regenerate: `LANDING_CAPTURES=1 pnpm exec playwright test --project=kit e2e-kit/landing-captures.spec.ts`
(deviceScaleFactor 2, after `networkidle` + 300 ms; the Storybook "kind" banner is hidden; most are the
story's own frame or a clipped region of it). The spec writes scratch PNGs to the gitignored
`apps/web/.landing-captures/`; convert each to WebP (quality 82) into `public/landing/web/`. Stories pin
their own scheme, so the dark My Day shots are the dark pane of the "both schemes" stories. Source
commit: this branch.

| File | Story id | Size |
|---|---|---|
| web-my-day-desktop-dark | do-surface--both-schemes (right pane) | 1424x1280 |
| web-plan-timeline-desktop-light | plan-page--busy-day-desktop (scrolled, clipped) | 760x1536 |
| web-my-day-mobile-dark | do-surface--both-schemes-narrow (right pane) | 780x1280 |
| web-session-mobile-dark | session-session-sheet--running (dark; replaces the planned light name) | 780x1342 |

## ios/, watchos/ — `zheref/KroApple` @ 70b2ee566 (read-only)

Source root `KroTests/Application/`, iPhone 17 Pro goldens 1170x2532 scaled to 780 wide with `sips --resampleWidth`.

| File | Source |
|---|---|
| ios-plan-timeline / -matrix | Plan/__Snapshots__/PlanViewDestinationsSnapshotTests/test_destination_timeline / priorityMatrix .1 |
| ios-inbox | Inbox/.../InboxSnapshotTests/test_snapshot_recentlyAddedAndPending.1 |
| ios-triage-prioritize | Triage/.../TriageSnapshotTests/test_prioritize_startNow.1 |
| ios-day-progress | DayProgress/.../DayProgressSnapshotTests/test_snapshot_sessionsAndOneCompletion.1 |
| ios-live-activity-running | Session/.../FocusSessionLiveActivitySnapshotTests/test_snapshot_runningCountdown.running (1266 -> 844 wide) |
| watch-featured | `KroWatchTests/__Snapshots__/WatchViewSnapshotTests/featured_typical` (unscaled) |

## android/ — `zheref/KroAndroid` @ b33bf23 (read-only)

Source `app/src/test/snapshots/images/io.zheref.kro.application.earn_EarnPageSnapshotTest_Celebrating`
(Paparazzi, 461x1000, unscaled), as `android-earn-celebrating`.

## brand/

`kro-mark-512.png` / `kro-mark-192.png` come from `KroUI/Assets.xcassets/KroMark.imageset/KroMark.png`
(1024). `kro-icon-512.png` comes from `Kro/Assets.xcassets/AppIcon.appiconset/Kro-Light-1024×1024.png`.
The two sources are byte-identical files, so the mark and the icon are the same artwork.
