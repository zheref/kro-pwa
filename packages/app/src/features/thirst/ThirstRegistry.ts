/**
 * The client-side mirror of the shared feature registry's *available soon*
 * set — canon `KroCore/Domain/ThirstRegistry.swift` (epic #83, sub-issue
 * #86's dead-end audit). A dead-end whose key is absent here is **not
 * votable** — the surface shows a plain "coming soon" card with no vote
 * affordance, never a vote for a feature the registry doesn't list (the
 * generic *Unknown* fallback).
 *
 * `#35`'s four routes (`matrix`, `board`, `blueprints`, `habits`) are the
 * ones this issue wires; `notifications` is kept in the registry for parity
 * with canon (it is a sheet reached from the Profile menu on iPhone, not a
 * sidebar destination — out of this issue's route lane, `#34`/a later
 * child's surface to mount).
 */

export interface ThirstRegistryFeature {
  readonly key: string
  readonly title: string
  readonly blurb: string
}

/** `ThirstRegistry.availableSoon`, keyed by stable feature key. */
export const THIRST_AVAILABLE_SOON: Readonly<Record<string, ThirstRegistryFeature>> = {
  matrix: {
    key: 'matrix',
    title: 'Priority Matrix',
    blurb: 'Sort what matters by urgency and importance.',
  },
  board: {
    key: 'board',
    title: 'Board',
    blurb: 'Organize your work on a flexible board.',
  },
  blueprints: {
    key: 'blueprints',
    title: 'Blueprints',
    blurb: 'Reusable templates to start endeavors faster.',
  },
  habits: {
    key: 'habits',
    title: 'Habits',
    blurb: 'Build routines and keep your streaks alive.',
  },
  notifications: {
    key: 'notifications',
    title: 'Notifications',
    blurb: 'Fine-tune reminders and daily nudges.',
  },
}

/** Canon's `ThirstRegistry.isVotable(_:)`. */
export function isThirstVotable(featureKey: string): boolean {
  return featureKey in THIRST_AVAILABLE_SOON
}

/**
 * Canon's `ThirstRegistry.title(for:)` — the registry's own title, preferred
 * over any caller-supplied one so the surface can't drift from it.
 */
export function thirstFeatureTitle(featureKey: string): string | null {
  return THIRST_AVAILABLE_SOON[featureKey]?.title ?? null
}

/** Canon's `ThirstRegistry.blurb(for:)`. */
export function thirstFeatureBlurb(featureKey: string): string | null {
  return THIRST_AVAILABLE_SOON[featureKey]?.blurb ?? null
}
