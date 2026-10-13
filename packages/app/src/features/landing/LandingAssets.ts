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
 * `src` is the WebP master actually served — no PNG ships. `webp` stays in the
 * type as an optional override that the device frames read (`webp ?? src`).
 */
export type LandingPlatform = 'web' | 'ios' | 'ipados' | 'watchos' | 'android'

export type LandingAsset = {
  readonly src: string
  readonly webp?: string
  readonly width: number
  readonly height: number
  readonly alt: string
  readonly platform: LandingPlatform
  readonly scene: string
  readonly theme: 'light' | 'dark'
}

export type LandingAssetKey =
  | 'webMyDayDesktopDark'
  | 'webPlanTimelineDesktopLight'
  | 'webMyDayMobileDark'
  | 'webSessionMobileDark'
  | 'iosPlanTimeline'
  | 'iosPlanMatrix'
  | 'iosInbox'
  | 'iosTriagePrioritize'
  | 'iosDayProgress'
  | 'iosLiveActivityRunning'
  | 'watchosFeatured'
  | 'androidEarnCelebrating'

export const landingAssets: Record<LandingAssetKey, LandingAsset> = {
  webMyDayDesktopDark: {
    src: '/landing/web/web-my-day-desktop-dark.webp',
    width: 1424,
    height: 1280,
    alt: "Kro's My Day in a desktop-sized window, dark theme: the header with the date and progress ring, reminders, a calendar event and the Now lane of task cards on a dark canvas.",
    platform: 'web',
    scene: 'My Day, desktop',
    theme: 'dark',
  },
  webPlanTimelineDesktopLight: {
    src: '/landing/web/web-plan-timeline-desktop-light.webp',
    width: 760,
    height: 1536,
    alt: "Kro's Plan timeline for a busy Monday: a day picker above an hourly grid with overlapping events such as Design review, Vendor call, Sync and Retro.",
    platform: 'web',
    scene: 'Plan timeline',
    theme: 'light',
  },
  webMyDayMobileDark: {
    src: '/landing/web/web-my-day-mobile-dark.webp',
    width: 780,
    height: 1280,
    alt: "Kro's My Day in a phone-sized window, dark theme: the date and progress ring, reminders, a calendar event and the Now lane of task cards.",
    platform: 'web',
    scene: 'My Day, phone-sized',
    theme: 'dark',
  },
  webSessionMobileDark: {
    src: '/landing/web/web-session-mobile-dark.webp',
    width: 780,
    height: 1342,
    alt: "Kro's focus session sheet on a phone-sized window: a Pomodoro clock counting down from fifteen minutes for the task Prepare slides, with pause and stop buttons.",
    platform: 'web',
    scene: 'Focus session running',
    theme: 'dark',
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
  iosLiveActivityRunning: {
    src: '/landing/ios/ios-live-activity-running.webp',
    width: 844,
    height: 384,
    alt: "Kro's lock screen Live Activity on iPhone: a purple card reading Focusing, Draft release notes and 15:00, with Pause and Finish buttons.",
    platform: 'ios',
    scene: 'Live Activity, running countdown',
    theme: 'dark',
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
}

export function landingAssetsByPlatform(
  platform: LandingPlatform,
): readonly LandingAsset[] {
  return Object.values(landingAssets).filter(
    (asset) => asset.platform === platform,
  )
}
