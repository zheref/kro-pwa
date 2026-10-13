# Landing assets

Screenshots for the Kro landing page. Typed catalog: `packages/app/src/features/landing/LandingAssets.ts`
(its test reads every file here and checks the PNG header against the catalog).

**Mock-only guarantee.** Every image is a render of mock fixtures: a Storybook story of this web app or
a recorded snapshot golden of the Kro apps (which render fixtures, never user data). Nothing was
captured from a real account. Nothing was copied from any signing/artifacts folder.

Each image ships as `.png` (always) plus a `.webp` sibling (quality 82, via sharp) that the catalog
prefers. Pixel sizes below are the PNG sizes.

## web/ — this repo's Storybook (`apps/web/e2e-kit/landing-captures.spec.ts`)

Regenerate: `LANDING_CAPTURES=1 pnpm exec playwright test --project=kit e2e-kit/landing-captures.spec.ts`
(deviceScaleFactor 2, after `networkidle` + 300 ms; the Storybook "kind" banner is hidden; most are the
story's own frame or a clipped region of it). The shell stories are empty-state only, so My Day is the
`Do/Surface` story, not `MainShell`. Stories pin their own scheme, so the dark My Day shots are the
dark pane of the "both schemes" stories. The source stories show a few section titles white-on-white in
light theme (a story-frame artefact, not captured separately). Source commit: this branch.

| File | Story id | Size |
|---|---|---|
| web-my-day-desktop-light | do-surface--desktop | 2240x1440 |
| web-my-day-desktop-dark | do-surface--both-schemes (right pane) | 1424x1280 |
| web-plan-timeline-desktop-light | plan-page--busy-day-desktop (scrolled, clipped) | 760x1536 |
| web-matrix-desktop-light | plan-priority-matrix--all-four-quadrants (clipped) | 840x1160 |
| web-earn-desktop-light | earn-earnpage--typical | 2880x1280 |
| web-capture-prompt-desktop-dark | capture-prompt--popover-with-two-suggestions-selected (dark; replaces the planned light name) | 1392x1736 |
| web-my-day-mobile-light | do-surface--handheld (390 wide) | 780x1560 |
| web-my-day-mobile-dark | do-surface--both-schemes-narrow (right pane) | 780x1280 |
| web-earn-mobile-light | earn-earnfragment--mobile-gear-both-schemes (left pane) | 900x1280 |
| web-session-mobile-dark | session-session-sheet--running (dark; replaces the planned light name) | 780x1342 |

## ios/, ipados/, watchos/ — `zheref/KroApple` @ 70b2ee566 (read-only)

Source root `KroTests/Application/`, iPhone 17 Pro goldens 1170x2532 scaled to 780 wide with `sips --resampleWidth`
(`ios-do-populated-lanes` additionally palette-quantized, 256 colours, to fit the size budget).

| File | Source |
|---|---|
| ios-do-populated-lanes | Do/__Snapshots__/DoScreenSnapshotTests/test_snapshot_doScreen_populatedLanes.1 |
| ios-plan-timeline / -matrix / -list | Plan/__Snapshots__/PlanViewDestinationsSnapshotTests/test_destination_timeline / priorityMatrix / list .1 |
| ios-inbox | Inbox/.../InboxSnapshotTests/test_snapshot_recentlyAddedAndPending.1 |
| ios-triage-prioritize | Triage/.../TriageSnapshotTests/test_prioritize_startNow.1 |
| ios-earn-challenges | Earn/.../EarnSnapshotTests/test_snapshot_challenges.1 |
| ios-earn-milestones | Earn/.../EarnSnapshotTests/test_snapshot_milestones.1 (no gold-ring golden exists; closest is this) |
| ios-day-progress | DayProgress/.../DayProgressSnapshotTests/test_snapshot_sessionsAndOneCompletion.1 |
| ios-find | Find/.../FindSnapshotTests/test_snapshot_mixedEndeavors.1 |
| ios-session-running | Session/.../SessionSetupSnapshotTests/test_snapshot_standardRunningSheet.1 |
| ios-live-activity-running | Session/.../FocusSessionLiveActivitySnapshotTests/test_snapshot_runningCountdown.running (1266 -> 844 wide) |
| ipad-sidebar | Main/.../MainSidebarSnapshotTests/test_snapshot_sidebarTabletRegular.1 (960 wide, unscaled) |
| watch-featured, watch-featured-overdue | `KroWatchTests/__Snapshots__/WatchViewSnapshotTests/featured_typical`, `featured_overdue` (unscaled; no session dial golden exists) |

## android/ — `zheref/KroAndroid` @ b33bf23 (read-only)

Source `app/src/test/snapshots/images/io.zheref.kro.application.*` (Paparazzi, 461x1000, unscaled):
`dayprogress_DayProgressPageSnapshotTest_aFullDay`, `earn_EarnPageSnapshotTest_Celebrating`,
`session_SessionPageSnapshotTest_Paused`, `doing_DoScreenSnapshotTest_Loaded_state_—_full_screen`.

## brand/

`kro-mark-512.png` / `kro-mark-192.png` come from `KroUI/Assets.xcassets/KroMark.imageset/KroMark.png`
(1024). `kro-icon-512.png` comes from `Kro/Assets.xcassets/AppIcon.appiconset/Kro-Light-1024×1024.png`.
The two sources are byte-identical files, so the mark and the icon are the same artwork.
