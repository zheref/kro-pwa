/**
 * The landing page's screenshots, as a typed catalog (platform-free, no imports).
 *
 * Every image is a MOCK-FIXTURE render — a Storybook story of this app or a
 * recorded snapshot golden of the Kro apps — never a capture of real data.
 * Provenance per file lives in `apps/web/public/landing/README.md`; the sibling
 * test reads each file from disk and checks its pixel size against this table,
 * so the catalog cannot go stale.
 *
 * `src` is the PNG (always present); `webp` is the smaller sibling to prefer.
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
  | 'webMyDayDesktopLight'
  | 'webMyDayDesktopDark'
  | 'webPlanTimelineDesktopLight'
  | 'webMatrixDesktopLight'
  | 'webEarnDesktopLight'
  | 'webCapturePromptDesktopDark'
  | 'webMyDayMobileLight'
  | 'webMyDayMobileDark'
  | 'webEarnMobileLight'
  | 'webSessionMobileDark'
  | 'iosDoPopulatedLanes'
  | 'iosPlanTimeline'
  | 'iosPlanMatrix'
  | 'iosPlanList'
  | 'iosInbox'
  | 'iosTriagePrioritize'
  | 'iosEarnChallenges'
  | 'iosEarnMilestones'
  | 'iosDayProgress'
  | 'iosFind'
  | 'iosSessionRunning'
  | 'iosLiveActivityRunning'
  | 'ipadosSidebar'
  | 'watchosFeatured'
  | 'watchosFeaturedOverdue'
  | 'androidDayProgress'
  | 'androidEarnCelebrating'
  | 'androidSessionPaused'
  | 'androidDoLoaded'

export const landingAssets: Record<LandingAssetKey, LandingAsset> = {
  webMyDayDesktopLight: {
    src: '/landing/web/web-my-day-desktop-light.png',
    webp: '/landing/web/web-my-day-desktop-light.webp',
    width: 2240,
    height: 1440,
    alt: "Kro's My Day in a desktop-sized window, light theme: a purple header with the date and a progress ring, a Reminders row, a Calendar event, and a Now lane of task cards.",
    platform: 'web',
    scene: 'My Day, desktop',
    theme: 'light',
  },
  webMyDayDesktopDark: {
    src: '/landing/web/web-my-day-desktop-dark.png',
    webp: '/landing/web/web-my-day-desktop-dark.webp',
    width: 1424,
    height: 1280,
    alt: "Kro's My Day in a desktop-sized window, dark theme: the header with the date and progress ring, reminders, a calendar event and the Now lane of task cards on a dark canvas.",
    platform: 'web',
    scene: 'My Day, desktop',
    theme: 'dark',
  },
  webPlanTimelineDesktopLight: {
    src: '/landing/web/web-plan-timeline-desktop-light.png',
    webp: '/landing/web/web-plan-timeline-desktop-light.webp',
    width: 760,
    height: 1536,
    alt: "Kro's Plan timeline for a busy Monday: a day picker above an hourly grid with overlapping events such as Design review, Vendor call, Sync and Retro.",
    platform: 'web',
    scene: 'Plan timeline',
    theme: 'light',
  },
  webMatrixDesktopLight: {
    src: '/landing/web/web-matrix-desktop-light.png',
    webp: '/landing/web/web-matrix-desktop-light.webp',
    width: 840,
    height: 1160,
    alt: "Kro's priority matrix as four cards: Prioritize (urgent and important) with two tasks, Schedule with one, Delegate with one, and Archive with one.",
    platform: 'web',
    scene: 'Priority matrix',
    theme: 'light',
  },
  webEarnDesktopLight: {
    src: '/landing/web/web-earn-desktop-light.png',
    webp: '/landing/web/web-earn-desktop-light.webp',
    width: 2880,
    height: 1280,
    alt: "Kro's Earn page: a reward ready to claim, rewards still being earned with progress bars, and a list of suggested rewards to add.",
    platform: 'web',
    scene: 'Earn, desktop',
    theme: 'light',
  },
  webCapturePromptDesktopDark: {
    src: '/landing/web/web-capture-prompt-desktop-dark.png',
    webp: '/landing/web/web-capture-prompt-desktop-dark.webp',
    width: 1392,
    height: 1736,
    alt: "Kro's quick-capture prompt on a dark canvas, with a grid of suggested tasks and events above a text field where one types what to do.",
    platform: 'web',
    scene: 'Capture prompt with suggestions',
    theme: 'dark',
  },
  webMyDayMobileLight: {
    src: '/landing/web/web-my-day-mobile-light.png',
    webp: '/landing/web/web-my-day-mobile-light.webp',
    width: 780,
    height: 1560,
    alt: "Kro's My Day in a phone-sized window, light theme: the date and progress ring, a Reminders row, a calendar event and the Now lane of task cards.",
    platform: 'web',
    scene: 'My Day, phone-sized',
    theme: 'light',
  },
  webMyDayMobileDark: {
    src: '/landing/web/web-my-day-mobile-dark.png',
    webp: '/landing/web/web-my-day-mobile-dark.webp',
    width: 780,
    height: 1280,
    alt: "Kro's My Day in a phone-sized window, dark theme: the date and progress ring, reminders, a calendar event and the Now lane of task cards.",
    platform: 'web',
    scene: 'My Day, phone-sized',
    theme: 'dark',
  },
  webEarnMobileLight: {
    src: '/landing/web/web-earn-mobile-light.png',
    webp: '/landing/web/web-earn-mobile-light.webp',
    width: 900,
    height: 1280,
    alt: "Kro's Earn page in a phone-sized window: a claimable reward, rewards in progress with percentages, and suggested rewards with Add buttons.",
    platform: 'web',
    scene: 'Earn, phone-sized',
    theme: 'light',
  },
  webSessionMobileDark: {
    src: '/landing/web/web-session-mobile-dark.png',
    webp: '/landing/web/web-session-mobile-dark.webp',
    width: 780,
    height: 1342,
    alt: "Kro's focus session sheet on a phone-sized window: a Pomodoro clock counting down from fifteen minutes for the task Prepare slides, with pause and stop buttons.",
    platform: 'web',
    scene: 'Focus session running',
    theme: 'dark',
  },
  iosDoPopulatedLanes: {
    src: '/landing/ios/ios-do-populated-lanes.png',
    webp: '/landing/ios/ios-do-populated-lanes.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Do screen: a purple header with the date, a week strip, and a Now lane of task cards followed by an Overdue lane.',
    platform: 'ios',
    scene: 'Do with populated lanes',
    theme: 'light',
  },
  iosPlanTimeline: {
    src: '/landing/ios/ios-plan-timeline.png',
    webp: '/landing/ios/ios-plan-timeline.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Plan in timeline view: a week strip with Monday the 20th selected above an hourly day grid holding Quick Sync, Team Standup and Product Design events.',
    platform: 'ios',
    scene: 'Plan timeline',
    theme: 'light',
  },
  iosPlanMatrix: {
    src: '/landing/ios/ios-plan-matrix.png',
    webp: '/landing/ios/ios-plan-matrix.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Plan in priority matrix view: four cards named Prioritize, Schedule, Delegate and Archive, each holding task tiles, with Add new and Add existing buttons on Archive.',
    platform: 'ios',
    scene: 'Plan priority matrix',
    theme: 'light',
  },
  iosPlanList: {
    src: '/landing/ios/ios-plan-list.png',
    webp: '/landing/ios/ios-plan-list.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Plan in list view: a week strip above Past Events and Coming Next sections listing meetings such as Team Standup, Product Design Review and Lunch with Sarah with their times.',
    platform: 'ios',
    scene: 'Plan list',
    theme: 'light',
  },
  iosInbox: {
    src: '/landing/ios/ios-inbox.png',
    webp: '/landing/ios/ios-inbox.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Inbox with three endeavors: Recently Added items and a Pending Triage item, each with Triage and Add for Today buttons.',
    platform: 'ios',
    scene: 'Inbox',
    theme: 'light',
  },
  iosTriagePrioritize: {
    src: '/landing/ios/ios-triage-prioritize.png',
    webp: '/landing/ios/ios-triage-prioritize.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, triage form for the task Email VP about timeline: value stars, due date, duration chips and an urgent-and-important matrix with Prioritize chosen, plus Ready and Start Now buttons.',
    platform: 'ios',
    scene: 'Triage, prioritize',
    theme: 'light',
  },
  iosEarnChallenges: {
    src: '/landing/ios/ios-earn-challenges.png',
    webp: '/landing/ios/ios-earn-challenges.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Earn challenges: Five This Week at two of five and Morning Trio at zero of three, each with a progress bar.',
    platform: 'ios',
    scene: 'Earn challenges',
    theme: 'light',
  },
  iosEarnMilestones: {
    src: '/landing/ios/ios-earn-milestones.png',
    webp: '/landing/ios/ios-earn-milestones.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Earn milestones: Deep Work Decathlon at three of ten and Project Closer at eleven of twenty-five, each with a trophy or medal icon.',
    platform: 'ios',
    scene: 'Earn milestones',
    theme: 'light',
  },
  iosDayProgress: {
    src: '/landing/ios/ios-day-progress.png',
    webp: '/landing/ios/ios-day-progress.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Day Progress on a dark screen: a week of activity rings, a large ring with Habits 0 of 1 and Tasks 1 of 3 done, and an activity list with Deep work on Kro, Read a chapter and Meditate.',
    platform: 'ios',
    scene: 'Day progress',
    theme: 'dark',
  },
  iosFind: {
    src: '/landing/ios/ios-find.png',
    webp: '/landing/ios/ios-find.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, Find: a purple screen of matching items as rows, such as Prepare quarterly report, Review PR for auth flow, Team sync and 1:1 with Manager, each with its due time and points.',
    platform: 'ios',
    scene: 'Find',
    theme: 'light',
  },
  iosSessionRunning: {
    src: '/landing/ios/ios-session-running.png',
    webp: '/landing/ios/ios-session-running.webp',
    width: 780,
    height: 1688,
    alt: 'Kro on iPhone, a focus session running on a green sheet: the task Write release notes with a 24:00 Pomodoro countdown ring, pause and stop buttons.',
    platform: 'ios',
    scene: 'Focus session running',
    theme: 'dark',
  },
  iosLiveActivityRunning: {
    src: '/landing/ios/ios-live-activity-running.png',
    webp: '/landing/ios/ios-live-activity-running.webp',
    width: 844,
    height: 384,
    alt: "Kro's lock screen Live Activity on iPhone: a purple card reading Focusing, Draft release notes and 15:00, with Pause and Finish buttons.",
    platform: 'ios',
    scene: 'Live Activity, running countdown',
    theme: 'dark',
  },
  ipadosSidebar: {
    src: '/landing/ipados/ipad-sidebar.png',
    webp: '/landing/ipados/ipad-sidebar.webp',
    width: 960,
    height: 1800,
    alt: "Kro's sidebar on iPad: a Get started group with Today and All Tasks, and a Workflow group with Jot Down, Plan, Execute and Earn.",
    platform: 'ipados',
    scene: 'Sidebar on iPad',
    theme: 'light',
  },
  watchosFeatured: {
    src: '/landing/watchos/watch-featured.png',
    webp: '/landing/watchos/watch-featured.webp',
    width: 396,
    height: 484,
    alt: 'Kro on Apple Watch: a Now Hero card for the high-priority task Prepare presentation at 7:00 PM with a Start Focus 45m button.',
    platform: 'watchos',
    scene: 'Featured task',
    theme: 'dark',
  },
  watchosFeaturedOverdue: {
    src: '/landing/watchos/watch-featured-overdue.png',
    webp: '/landing/watchos/watch-featured-overdue.webp',
    width: 396,
    height: 484,
    alt: 'Kro on Apple Watch: a Now Hero card for the high-priority task Prepare presentation marked 2h ago in red, with a Start Focus 45m button.',
    platform: 'watchos',
    scene: 'Featured task, overdue',
    theme: 'dark',
  },
  androidDayProgress: {
    src: '/landing/android/android-day-progress.png',
    webp: '/landing/android/android-day-progress.webp',
    width: 461,
    height: 1000,
    alt: 'Kro on Android, Day Progress: a week of rings, a large ring with habit and task totals, and an activity list of a completed session, a run and a reading session.',
    platform: 'android',
    scene: 'Day progress, a full day',
    theme: 'light',
  },
  androidEarnCelebrating: {
    src: '/landing/android/android-earn-celebrating.png',
    webp: '/landing/android/android-earn-celebrating.webp',
    width: 461,
    height: 1000,
    alt: 'Kro on Android, the Earn screen on a dark theme with a Milestone reached celebration popup over the in-progress rewards, after a reward was claimed.',
    platform: 'android',
    scene: 'Earn celebrating a claim',
    theme: 'light',
  },
  androidSessionPaused: {
    src: '/landing/android/android-session-paused.png',
    webp: '/landing/android/android-session-paused.webp',
    width: 461,
    height: 1000,
    alt: 'Kro on Android, the Session Timer paused on a light screen: a goal field reading Write Phase 7 docs, a 19:00 ring and resume and stop buttons.',
    platform: 'android',
    scene: 'Focus session paused',
    theme: 'light',
  },
  androidDoLoaded: {
    src: '/landing/android/android-do-loaded.png',
    webp: '/landing/android/android-do-loaded.webp',
    width: 461,
    height: 1000,
    alt: 'Kro on Android, the Do screen on a dark theme for May 6: a suggestions card, the Now lane with a task card and an Overdue lane.',
    platform: 'android',
    scene: 'Do, loaded',
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
