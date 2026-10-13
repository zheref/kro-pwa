/**
 * Everything the landing page says, typed and in one place.
 *
 * No number, count, rating or testimonial appears here, by rule: the page
 * claims only what the product is and does. The canon lines are Kro's own
 * words; the rest is plain description of shipped behaviour.
 */

export const LANDING_BRAND = 'Kro'
export const LANDING_TAGLINE = 'Manage your time, like the gods'

export const heroCopy = {
  eyebrow: 'Plan · Do · Earn',
  title: "Control your time. Don't let time control you.",
  lede: 'Plan, Do and Earn, in one personal execution system — on your Mac, iPhone, Apple Watch and the web.',
  primary: 'Open Kro for Web',
  secondary: 'Get early access',
} as const

export const loopCopy = {
  eyebrow: 'The loop',
  title: 'A day, resolved.',
  lede: 'Capture a thought, triage it, plan it, do it and earn from it. Five small steps, one calm loop.',
} as const

export interface ChapterCopy {
  readonly id: string
  readonly eyebrow: string
  readonly title: string
  readonly body: string
  /** Short, true highlights under the body. */
  readonly points: readonly string[]
}

export const loopChapters: readonly ChapterCopy[] = [
  {
    id: 'capture',
    eyebrow: '1 · Capture',
    title: 'Get it out of your head.',
    body: 'Capture is the one place where a thought becomes an endeavor. Type it, and it waits in your Inbox until you are ready to decide.',
    points: [
      'One prompt, always within reach',
      'Everything lands in the Inbox',
    ],
  },
  {
    id: 'triage',
    eyebrow: '2 · Triage',
    title: 'Decide, one card at a time.',
    body: 'Triage turns the Inbox into decisions. Rate each endeavor with Value stars and Effort flames, then choose what it deserves.',
    points: ['Prioritize', 'Schedule', 'Delegate', 'Archive'],
  },
  {
    id: 'plan',
    eyebrow: '3 · Plan',
    title: 'See the day you are choosing.',
    body: 'Plan lays the same endeavors out three honest ways, so you can pick the view that fits the question you are asking.',
    points: ['Timeline', 'List', 'Priority Matrix'],
  },
  {
    id: 'do',
    eyebrow: '4 · Do',
    title: 'Know what is next.',
    body: 'My Day sorts what is on your plate into lanes, so the next move is never a guess.',
    points: ['Now', 'Overdue', 'Next', 'Later', 'Anytime'],
  },
  {
    id: 'earn',
    eyebrow: '5 · Earn',
    title: 'Finished work should feel like something.',
    body: 'Rewards, Milestones and Challenges turn finished work into prizes you chose. A closed ring means you’ve finished everything the day asked of you.',
    points: ['Rewards', 'Milestones', 'Challenges', 'Day Progress rings'],
  },
]

export const focusCopy = {
  eyebrow: 'Focus',
  title: 'Stay with one thing.',
  lede: 'Start a Session from any endeavor: a countdown or a stopwatch, with breaks built in.',
  pill: {
    title: 'The Session Pill',
    body: 'While a Session runs, a small pill follows you around the app, so you never lose your place or the time.',
  },
  liveActivity: {
    title: 'On the Lock Screen',
    body: 'On iPhone, a Live Activity keeps your running Session on the Lock Screen, with Pause and Finish within reach.',
  },
  watch: {
    title: 'On your wrist',
    body: 'The wrist is a mirror, not a second opinion.',
  },
  modes: {
    title: 'Countdown or stopwatch',
    body: 'Count down to a goal, or count up when the work decides how long it takes. Breaks are part of the rhythm, not an interruption of it.',
  },
} as const

export const platformsCopy = {
  eyebrow: 'Platforms',
  title: 'Wherever your day is.',
  lede: 'Available soon — vote to get it sooner.',
  voteLabel: 'Vote for',
  voteHint: 'Tell us which platform to build next.',
} as const

export type PlatformKey =
  | 'ios'
  | 'ipados'
  | 'macos'
  | 'watchos'
  | 'web'
  | 'android'
  | 'windows'

export type PlatformStatusKey = 'live' | 'testflight' | 'in-progress' | 'coming'

export interface PlatformCopy {
  readonly platform: PlatformKey
  readonly label: string
  readonly status: PlatformStatusKey
  readonly body: string
}

export const platformCards: readonly PlatformCopy[] = [
  {
    platform: 'ios',
    label: 'iPhone',
    status: 'testflight',
    body: 'Early access on TestFlight. The full loop, with a Live Activity for your Session.',
  },
  {
    platform: 'ipados',
    label: 'iPad',
    status: 'testflight',
    body: 'Early access on TestFlight. A sidebar for the whole workflow.',
  },
  {
    platform: 'macos',
    label: 'Mac',
    status: 'testflight',
    body: 'Early access on TestFlight. The desktop home of your plans.',
  },
  {
    platform: 'watchos',
    label: 'Apple Watch',
    status: 'testflight',
    body: 'Early access on TestFlight. What is Now, one glance away.',
  },
  {
    platform: 'web',
    label: 'Web',
    status: 'live',
    body: 'Live today. Installable, and it works from any modern browser.',
  },
  {
    platform: 'android',
    label: 'Android',
    status: 'in-progress',
    body: 'In progress. It is being built now.',
  },
  {
    platform: 'windows',
    label: 'Windows',
    status: 'coming',
    body: 'Coming. It is on the list, and your vote moves it up.',
  },
]

export const federationCopy = {
  eyebrow: 'Federation',
  title: 'Kro is a federation, not an island',
  lede: 'Your plans meet the tools you already use, instead of asking you to leave them.',
} as const

export interface FederationCard {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly status: 'available' | 'next'
}

export const federationCards: readonly FederationCard[] = [
  {
    id: 'kro-cloud',
    title: 'Kro Cloud',
    body: 'Sign in to Kro — sync your plans across devices.',
    status: 'available',
  },
  {
    id: 'apple-calendar',
    title: 'Apple Calendar',
    body: 'See your events alongside your endeavors on the same timeline.',
    status: 'available',
  },
  {
    id: 'apple-reminders',
    title: 'Apple Reminders',
    body: 'Bring your reminders into the day without retyping them.',
    status: 'available',
  },
  {
    id: 'google-calendar',
    title: 'Google Calendar',
    body: 'Connect Google Calendar and plan around what is already booked.',
    status: 'available',
  },
  {
    id: 'google-tasks',
    title: 'Google Tasks',
    body: 'Coming next.',
    status: 'next',
  },
  {
    id: 'microsoft-todo',
    title: 'Microsoft To Do',
    body: 'Coming next.',
    status: 'next',
  },
  { id: 'github', title: 'GitHub', body: 'Coming next.', status: 'next' },
  { id: 'jira', title: 'Jira', body: 'Coming next.', status: 'next' },
]

export const privacyCopy = {
  eyebrow: 'Privacy',
  title: 'Your day stays yours',
  lede: 'Kro measures how the product is used, never what you write in it.',
} as const

export interface PrivacyCard {
  readonly id: string
  readonly title: string
  readonly body: string
}

export const privacyCards: readonly PrivacyCard[] = [
  {
    id: 'yours',
    title: 'Your day stays yours',
    body: 'Your plans live on your device first. Sign in only if you want them to follow you to another one.',
  },
  {
    id: 'never-sent',
    title: 'We never send what you write',
    body: 'Counts and timings only — never the words you write.',
  },
  {
    id: 'random-id',
    title: 'You are a random identifier',
    body: 'Analytics is cookieless. A visit is a random identifier, not a name, an email or a profile.',
  },
]

export const earlyAccessCopy = {
  eyebrow: 'Early access',
  title: 'Be first through the door.',
  lede: 'Tell us where you want Kro, and we will write when it is ready for you.',
} as const

export interface FaqEntry {
  readonly id: string
  readonly question: string
  readonly answer: string
}

export const faqCopy = {
  eyebrow: 'Questions',
  title: 'Good questions, plainly answered.',
} as const

export const faqEntries: readonly FaqEntry[] = [
  {
    id: 'endeavor',
    question: 'What is an endeavor?',
    answer:
      'An endeavor is anything you have decided is worth your time — a task, an event or a habit. Capture creates it, and it travels through the loop until it is done.',
  },
  {
    id: 'free',
    question: 'Is Kro free?',
    answer:
      'Kro for Web is open to use today, and you can start without an account. We have not announced pricing for the other platforms, and we would rather say so than guess.',
  },
  {
    id: 'data',
    question: 'Where is my data stored?',
    answer:
      'On your device first. If you sign in, your plans sync through Kro Cloud. Analytics counts and timings only — never the words you write.',
  },
  {
    id: 'offline',
    question: 'Does it work offline?',
    answer:
      'Kro for Web installs as an app and its shell opens without a connection, with your plans kept on your device. Syncing through Kro Cloud needs a connection.',
  },
  {
    id: 'platforms',
    question: 'Which platforms?',
    answer:
      'The web is live. iPhone, iPad, Mac and Apple Watch are in early access on TestFlight, Android is in progress and Windows is coming. Vote for the one you want sooner.',
  },
  {
    id: 'todo',
    question: 'How is this different from a to-do list?',
    answer:
      'A to-do list stores tasks. Kro runs the whole loop: Capture, Triage with Value and Effort, Plan, Do with focus Sessions, and Earn what you have worked for.',
  },
]

export const finalCtaCopy = {
  eyebrow: LANDING_TAGLINE,
  title: 'Start your first resolved day.',
  lede: 'Plan, Do and Earn, in one personal execution system.',
  primary: 'Open Kro for Web',
  secondary: 'Get early access',
} as const

export const footerCopy = {
  legal: `© 2026 Zheref · Kro — ${LANDING_TAGLINE}`,
  repo: 'https://github.com/zheref/kro-pwa',
} as const
