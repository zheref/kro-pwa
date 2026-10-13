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
(`PLAYWRIGHT_STORYBOOK_PORT` moves Storybook off 6007). The spec writes scratch PNGs to the gitignored
`apps/web/.landing-captures/`; resize each to 1600 px wide and convert to WebP (quality 82, sharp) into
`public/landing/web/`.

Both captures are the **real app**, not a component: the `Shell/App shell (live My Day)` story mounts
`MainShellPage` and `DoPage` over a seeded in-memory store, fills a 1440 x 900 viewport (deviceScaleFactor 2,
captured at 2880 x 1800), so the shell measures the browser itself and draws the gradient field, the glass
sidebar and the toolbar. The palette is the default (indigo-grape, `kroPalette: purple`). Light is the
product's default scheme (the hero and the Platforms band); dark is the second scheme (the Do chapter) so
the page proves both. The old bare-component captures (a `do-surface` story on a flat background, the Plan
timeline clip, the phone-sized and session windows) are gone: none of them was the product.

| File | Story id | Scheme | Size |
|---|---|---|---|
| web-my-day-desktop-light | shell-app-shell-live-my-day--my-day-in-the-shell | light | 1600x1000 |
| web-my-day-desktop-dark | shell-app-shell-live-my-day--my-day-in-the-shell | dark | 1600x1000 |

## ios/, watchos/ — `zheref/KroApple` @ 70b2ee566 (read-only)

Source root `KroTests/Application/`, iPhone 17 Pro goldens 1170x2532 scaled to 780 wide with `sips --resampleWidth`.

| File | Source |
|---|---|
| ios-do-populated-lanes | Do/__Snapshots__ (My Day with populated lanes; restored from da575bd; its header still reads "Loading...") |
| ios-session-running | Session/.../running session sheet (restored from da575bd) |
| ios-plan-timeline / -matrix | Plan/__Snapshots__/PlanViewDestinationsSnapshotTests/test_destination_timeline / priorityMatrix .1 |
| ios-inbox | Inbox/.../InboxSnapshotTests/test_snapshot_recentlyAddedAndPending.1 |
| ios-triage-prioritize | Triage/.../TriageSnapshotTests/test_prioritize_startNow.1 |
| ios-day-progress | DayProgress/.../DayProgressSnapshotTests/test_snapshot_sessionsAndOneCompletion.1 |
| ios-live-activity-running | Session/.../FocusSessionLiveActivitySnapshotTests/test_snapshot_runningCountdown.running (1266 -> 844 wide) |
| watch-featured | `KroWatchTests/__Snapshots__/WatchViewSnapshotTests/featured_typical` (unscaled) |

## ipados/

`ipad-sidebar` is the iPad sidebar golden, 960x1800 (a phone-proportioned render, not an iPad-ratio one):
`TabletFrame` crops it to the iPad's 820 x 1180 pt screen from the top.

## android/ — `zheref/KroAndroid` @ b33bf23 (read-only)

Source `app/src/test/snapshots/images/io.zheref.kro.application.earn_EarnPageSnapshotTest_Celebrating`
(Paparazzi, 461x1000, unscaled), as `android-earn-celebrating`; `android-day-progress` is the Day Progress
snapshot of the same suite (restored from da575bd).

## brand/

`kro-mark-512.png` / `kro-mark-192.png` come from `KroUI/Assets.xcassets/KroMark.imageset/KroMark.png`
(1024). `kro-icon-512.png` comes from `Kro/Assets.xcassets/AppIcon.appiconset/Kro-Light-1024×1024.png`.
The two sources are byte-identical files, so the mark and the icon are the same artwork.
