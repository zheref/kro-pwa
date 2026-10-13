/**
 * The landing page's screenshots, as a typed catalog (platform-free, no imports).
 *
 * Every image is a MOCK-FIXTURE render — a Storybook story of this app or a
 * recorded snapshot golden of the Kro apps — never a capture of real data.
 * Provenance per file lives in `docs/landing-assets.md`; the sibling test reads
 * each file's WebP header from disk and checks its pixel size against this
 * table, and checks that a section uses every key, so the catalog cannot go
 * stale or grow unused weight.
 *
 * `src` is the WebP master actually served — no PNG ships. Sizes are the
 * files' pixels: the iOS goldens are 390 x 844 pt at @2x, the web captures are
 * the 1440 x 900 pt desktop shell resized to 1600 px wide.
 */
export type LandingPlatform = 'web' | 'ios' | 'ipados' | 'watchos' | 'android'

export type LandingAsset = {
  readonly src: string
  readonly width: number
  readonly height: number
  readonly alt: string
  readonly platform: LandingPlatform
  readonly scene: string
  readonly theme: 'light' | 'dark'
}

export type LandingAssetKey =
  | 'webMyDayDesktopLight'
  | 'webMyDayDesktopDark'
  | 'iosDoPopulatedLanes'
  | 'iosPlanTimeline'
  | 'iosPlanMatrix'
  | 'iosInbox'
  | 'iosTriagePrioritize'
  | 'iosDayProgress'
  | 'iosSessionRunning'
  | 'iosLiveActivityRunning'
  | 'ipadosSidebar'
  | 'watchosFeatured'
  | 'androidEarnCelebrating'
  | 'androidDayProgress'

export const landingAssets: Record<LandingAssetKey, LandingAsset> = {
  webMyDayDesktopLight: {
    src: '/landing/web/web-my-day-desktop-light.webp',
    width: 1600,
    height: 1000,
    alt: "Kro on the web, My Day in the desktop shell: a glass sidebar with Today, All Tasks, the workflow and Adjust beside the day's reminders, a Design review calendar event and a Now lane of task cards, on the indigo-to-grape field.",
    platform: 'web',
    scene: 'My Day, desktop shell',
    theme: 'light',
  },
  webMyDayDesktopDark: {
    src: '/landing/web/web-my-day-desktop-dark.webp',
    width: 1600,
    height: 1000,
    alt: 'Kro on the web, My Day in the desktop shell with the dark theme: the same sidebar, reminders, Design review event and Now lane of task cards on a deep indigo field.',
    platform: 'web',
    scene: 'My Day, desktop shell',
    theme: 'dark',
  },
  iosDoPopulatedLanes: {
    src: '/landing/ios/ios-do-populated-lanes.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, My Day: the date and Tasks, Habits and Events chips above a week strip, then the Now lane with Fold laundry, Read research notes and Draft project update cards and an Overdue lane below.',
    platform: 'ios',
    scene: 'My Day with populated lanes',
    theme: 'light',
  },
  iosPlanTimeline: {
    src: '/landing/ios/ios-plan-timeline.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Plan in timeline view: a week strip with Monday the 20th selected above an hourly day grid holding Quick Sync, Team Standup and Product Design events.',
    platform: 'ios',
    scene: 'Plan timeline',
    theme: 'light',
  },
  iosPlanMatrix: {
    src: '/landing/ios/ios-plan-matrix.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Plan in priority matrix view: four cards named Prioritize, Schedule, Delegate and Archive, each holding task tiles, with Add new and Add existing buttons on Archive.',
    platform: 'ios',
    scene: 'Plan priority matrix',
    theme: 'light',
  },
  iosInbox: {
    src: '/landing/ios/ios-inbox.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Inbox with three endeavors: Recently Added items and a Pending Triage item, each with Triage and Add for Today buttons.',
    platform: 'ios',
    scene: 'Inbox',
    theme: 'light',
  },
  iosTriagePrioritize: {
    src: '/landing/ios/ios-triage-prioritize.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, triage form for the task Email VP about timeline: value stars, due date, duration chips and an urgent-and-important matrix with Prioritize chosen, plus Ready and Start Now buttons.',
    platform: 'ios',
    scene: 'Triage, prioritize',
    theme: 'light',
  },
  iosDayProgress: {
    src: '/landing/ios/ios-day-progress.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Day Progress on a dark screen: a week of activity rings, a large ring with Habits 0 of 1 and Tasks 1 of 3 done, and an activity list with Deep work on Kro, Read a chapter and Meditate.',
    platform: 'ios',
    scene: 'Day progress',
    theme: 'dark',
  },
  iosSessionRunning: {
    src: '/landing/ios/ios-session-running.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, a focus session running on a green sheet: the task Write release notes with a 24:00 Pomodoro countdown ring, pause and stop buttons.',
    platform: 'ios',
    scene: 'Focus session running',
    theme: 'dark',
  },
  iosLiveActivityRunning: {
    src: '/landing/ios/ios-live-activity-running.webp',
    width: 844,
    height: 384,
    alt: "Kro's lock screen Live Activity on iPhone: a purple card reading Focusing, Draft release notes and 15:00, with Pause and Finish buttons.",
    platform: 'ios',
    scene: 'Live Activity, running countdown',
    theme: 'dark',
  },
  ipadosSidebar: {
    src: '/landing/ipados/ipad-sidebar.webp',
    width: 960,
    height: 1800,
    alt: "Kro's sidebar on iPad: a Get started group with Today and All Tasks, and a Workflow group with Jot Down, Plan, Execute and Earn.",
    platform: 'ipados',
    scene: 'Sidebar on iPad',
    theme: 'light',
  },
  watchosFeatured: {
    src: '/landing/watchos/watch-featured.webp',
    width: 396,
    height: 484,
    alt: 'Kro on Apple Watch: a Now Hero card for the high-priority task Prepare presentation at 7:00 PM with a Start Focus 45m button.',
    platform: 'watchos',
    scene: 'Featured task',
    theme: 'dark',
  },
  androidEarnCelebrating: {
    src: '/landing/android/android-earn-celebrating.webp',
    width: 461,
    height: 1000,
    alt: 'Kro on Android, the Earn screen on a dark theme with a Milestone reached celebration popup over the in-progress rewards, after a reward was claimed.',
    platform: 'android',
    scene: 'Earn celebrating a claim',
    theme: 'dark',
  },
  androidDayProgress: {
    src: '/landing/android/android-day-progress.webp',
    width: 461,
    height: 1000,
    alt: 'Kro on Android, Day Progress: a week of rings, a large ring with habit and task totals, and an activity list of a completed session, a run and a reading session.',
    platform: 'android',
    scene: 'Day progress, a full day',
    theme: 'light',
  },
}

export function landingAssetsByPlatform(
  platform: LandingPlatform,
): readonly LandingAsset[] {
  return Object.values(landingAssets).filter(
    (asset) => asset.platform === platform,
  )
}
