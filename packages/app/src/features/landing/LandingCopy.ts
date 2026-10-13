import { PRICING_PATH } from './LandingSections'

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
    body: "Counts, timings, the page you are on and your browser's size and language — never the words you write.",
  },
  {
    id: 'random-id',
    title: 'A visit is not a person',
    body: 'Cookieless analytics: a visit is an anonymous, rotating hash, never a name or an email.',
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
  /** A link that follows the answer, for the detail behind it. */
  readonly link?: { readonly label: string; readonly href: string }
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
      'The core is free on every platform: capture, triage, plan, do and earn, with sync across your devices. Plus adds the AI features, more calendars and more palettes for about $5 a month, or less paid yearly. Plus is not on sale yet.',
    link: { label: 'See pricing', href: PRICING_PATH },
  },
  {
    id: 'data',
    question: 'Where is my data stored?',
    answer:
      "On your device first. If you sign in, your plans sync through Kro Cloud. Analytics counts, timings, the page you are on and your browser's size and language — never the words you write.",
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

/*
 * The pricing page. Launch pricing, aspirational and labelled so on the page:
 * Plus is not on sale, and anything not built today reads "Planned" in the
 * comparison. No count, rating or quote, as everywhere on the site.
 */

export const pricingCopy = {
  eyebrow: 'Pricing',
  title: 'Free is the whole loop. Plus is the part that thinks with you.',
  lede: 'Capture, triage, plan, do and earn cost nothing, on every platform. Plus adds the AI that plans alongside you, and keeps the maker shipping.',
  note: 'Launch pricing, subject to change. Plus is not on sale yet.',
  tiersTitle: 'Two plans',
  compareEyebrow: 'Compare',
  compareTitle: 'Everything, side by side.',
  compareLede:
    'What each plan includes. Planned means it is not built yet; it is not a date.',
  compareCaption: 'What Free and Plus include',
} as const

/** One line on a tier card: shipped today, or planned — never a check. */
export interface PricingFeature {
  readonly label: string
  readonly status: 'included' | 'planned'
}

const has = (label: string): PricingFeature => ({ label, status: 'included' })
const planned = (label: string): PricingFeature => ({
  label,
  status: 'planned',
})

export type PricingTierId = 'free' | 'plus'

export interface PricingTier {
  readonly id: PricingTierId
  readonly name: string
  readonly price: string
  readonly cadence: string
  /** A second way to pay, under the price. */
  readonly alternate?: string
  readonly promise: string
  readonly features: readonly PricingFeature[]
  readonly cta: string
  /** A short status shown beside the name. */
  readonly status: string
  /** The line under the call to action. */
  readonly ctaNote: string
}

export const pricingTiers: readonly PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'no card, no trial clock',
    promise: 'The loop as it ships today, on every platform.',
    features: [
      has('My Day'),
      has('Plan: the timeline'),
      planned('Plan: the Priority Matrix'),
      has('Tasks and lists'),
      planned('Habits'),
      has('Sessions: the focus timer'),
      planned('Breaks between Sessions'),
      has('Earn: rings, Challenges and Milestones'),
      has('Inbox and Triage'),
      planned('Board'),
      planned('Blueprints'),
      has('One calendar connection'),
      has('Sync across your devices'),
      has('Light, dark and four palettes'),
      has('The web app, and the Apple apps as they open'),
    ],
    cta: 'Open Kro for Web',
    status: 'Live today',
    ctaNote: 'Open on the web today, no account needed to start.',
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '$5',
    cadence: 'a month',
    alternate: 'or $48 a year, $4 a month',
    promise: 'Everything in Free, plus the part that thinks with you.',
    features: [
      has('Everything in Free'),
      planned('AI capture: a note becomes tasks'),
      planned('Plan my day'),
      planned('Natural-language capture'),
      planned('Session lengths that learn from you'),
      planned('A weekly review that writes itself'),
      planned('Smart reminders'),
      planned('Several calendars: Google and Outlook'),
      planned('More palettes and themes'),
      planned('Early access to new platforms'),
      has('You keep the maker shipping'),
    ],
    cta: 'Get early access',
    status: 'Not on sale yet',
    ctaNote:
      'Plus is not on sale yet. Join early access and we will write when it opens.',
  },
]

/** A comparison cell: included, not included, or not built yet. */
export type PricingCell = 'included' | 'excluded' | 'planned'

export interface PricingRow {
  readonly feature: string
  readonly free: PricingCell
  readonly plus: PricingCell
}

export interface PricingRowGroup {
  readonly title: string
  readonly rows: readonly PricingRow[]
}

const both = (feature: string): PricingRow => ({
  feature,
  free: 'included',
  plus: 'included',
})

const plusPlanned = (feature: string): PricingRow => ({
  feature,
  free: 'excluded',
  plus: 'planned',
})

/** Not built on any plan yet: Planned in both columns, never a check. */
const bothPlanned = (feature: string): PricingRow => ({
  feature,
  free: 'planned',
  plus: 'planned',
})

export const pricingComparison: readonly PricingRowGroup[] = [
  {
    title: 'The loop',
    rows: [
      both('Capture, Inbox and Triage'),
      both('My Day'),
      both('Plan: the timeline'),
      bothPlanned('Plan: the Priority Matrix'),
      both('Tasks and lists'),
      bothPlanned('Habits'),
      bothPlanned('Board'),
      bothPlanned('Blueprints'),
    ],
  },
  {
    title: 'Focus and reward',
    rows: [
      both('Sessions: the focus timer'),
      bothPlanned('Breaks between Sessions'),
      both('Earn: rings, Challenges and Milestones'),
    ],
  },
  {
    title: 'Thinks with you',
    rows: [
      plusPlanned('AI capture: a note becomes tasks'),
      plusPlanned('Plan my day'),
      plusPlanned('Natural-language capture'),
      plusPlanned('Session lengths that learn from you'),
      plusPlanned('A weekly review that writes itself'),
      plusPlanned('Smart reminders'),
    ],
  },
  {
    title: 'Calendars and integrations',
    rows: [
      both('One calendar connection (Google Calendar)'),
      plusPlanned('Several calendars: Google and Outlook'),
      plusPlanned('Google Tasks, Microsoft To Do, GitHub and Jira'),
    ],
  },
  {
    title: 'Everywhere',
    rows: [
      both('Sync across your devices'),
      both('Kro for Web'),
      both('The Apple apps, as they open'),
      plusPlanned('Early access to new platforms'),
    ],
  },
  {
    title: 'Make it yours',
    rows: [
      both('Light, dark and four palettes'),
      plusPlanned('More palettes and themes'),
    ],
  },
]

/** What a cell says, to the eye and to a screen reader. */
export const PRICING_CELL_TEXT: Record<
  PricingCell,
  { readonly mark: string; readonly label: string }
> = {
  included: { mark: '✓', label: 'Included' },
  excluded: { mark: '—', label: 'Not included' },
  planned: { mark: 'Planned', label: 'Planned' },
}

export const pricingFaqCopy = {
  eyebrow: 'Pricing questions',
  title: 'Plainly, before anyone pays.',
} as const

export const pricingFaqEntries: readonly FaqEntry[] = [
  {
    id: 'billing',
    question: 'How will billing work?',
    answer:
      'Plus will be $5 a month, or $48 a year, which is $4 a month. These are launch prices and may change before Plus opens. Nobody is charged today, because Plus is not on sale yet.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel any time?',
    answer:
      'That is the plan: cancel whenever you like and keep Plus until the end of the period you paid for. We will publish the exact terms before we take a single payment.',
  },
  {
    id: 'data',
    question: 'What happens to my data on Free?',
    answer:
      'It stays yours, with no time limit. Your plans live on your device first and sync through Kro Cloud if you sign in. Leaving Plus is meant to switch off the Plus features, never your plans.',
  },
  {
    id: 'discount',
    question: 'Is there a student or launch discount?',
    answer:
      'Not today, and we would rather say so than guess. If we add one, it will be on this page.',
  },
]

export const pricingCtaCopy = {
  eyebrow: heroCopy.eyebrow,
  title: 'Start free today.',
  lede: 'The whole loop is open on the web. Plus follows when it is ready.',
  primary: 'Open Kro for Web',
  secondary: 'Get early access',
} as const

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
