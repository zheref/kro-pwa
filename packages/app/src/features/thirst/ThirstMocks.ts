/**
 * The Thirst feature's canned fixtures (`RC-31`, `UZF-18`) — canned
 * `ThirstVoteEntryState`/`ThirstState` variants that back both the slice's
 * own tests and the render-tier tests (`ComingSoonPage.test.tsx`,
 * `ThirstDestinationPage.test.tsx`), so a scenario is never hand-built twice.
 */
import { ThirstExceptions } from './ThirstException'
import {
  initialThirstState,
  initialThirstVoteEntry,
  type ThirstState,
  type ThirstVoteEntryState,
} from './ThirstFeature'
import {
  bumpVotePlatform,
  type FeatureVoteCounts,
  VotePlatform,
} from './ThirstModels'

/** The registry key every mock below is built against — a real votable key
 * (`ThirstRegistry.ts`), so a story/test exercises the actual "Priority
 * Matrix" title rather than an invented one. */
export const THIRST_MOCK_FEATURE_KEY = 'matrix'

export const thirstCountsFixture: FeatureVoteCounts = {
  featureKey: THIRST_MOCK_FEATURE_KEY,
  total: 42,
  perPlatform: { [VotePlatform.ios]: 30, [VotePlatform.android]: 12 },
}

/** The states the Thirst vote surface claims to support — canon's five
 * (`docs/Features/Thirst.md`'s "States" section). */
export const thirstEntryMocks = {
  /** Nothing asked for yet — first paint before the Page mounts. */
  idle: initialThirstVoteEntry,

  /** Both the auth check and the counts fetch are in flight. */
  loading: {
    ...initialThirstVoteEntry,
    isCheckingVoteState: true,
    isLoadingCounts: true,
  } satisfies ThirstVoteEntryState,

  /**
   * Signed in, not yet voted, counts loaded — both checks have RESOLVED, so
   * `isCheckingVoteState` is explicitly `false` here rather than inherited
   * from `initialThirstVoteEntry`'s default (`true`, meaning "not yet
   * known" — see that field's own doc comment). Every other "resolved"
   * mock below does the same for the same reason.
   */
  votable: {
    ...initialThirstVoteEntry,
    counts: thirstCountsFixture,
    isCheckingVoteState: false,
  } satisfies ThirstVoteEntryState,

  /** Already voted — the `web` tally the vote bumped is visible. */
  voted: {
    ...initialThirstVoteEntry,
    counts: bumpVotePlatform(
      thirstCountsFixture,
      THIRST_MOCK_FEATURE_KEY,
      VotePlatform.web,
    ),
    alreadyVoted: true,
    isCheckingVoteState: false,
  } satisfies ThirstVoteEntryState,

  /** Signed out — the vote-state check failed with the typed reason. */
  unavailableSignedOut: {
    ...initialThirstVoteEntry,
    voteStateException: ThirstExceptions.notSignedIn(),
    isCheckingVoteState: false,
  } satisfies ThirstVoteEntryState,

  /** Offline before the auth check ever resolved — no counts loaded either. */
  unavailableOffline: {
    ...initialThirstVoteEntry,
    voteStateException: ThirstExceptions.offline(),
    isCheckingVoteState: false,
  } satisfies ThirstVoteEntryState,

  /** A vote request in flight — both checks already resolved cleanly. */
  voting: {
    ...initialThirstVoteEntry,
    counts: thirstCountsFixture,
    isVoting: true,
    isCheckingVoteState: false,
  } satisfies ThirstVoteEntryState,

  /** A vote attempt failed — the surface stays votable for a retry. */
  voteFailed: {
    ...initialThirstVoteEntry,
    counts: thirstCountsFixture,
    voteException: ThirstExceptions.unknown('insert failed'),
    isCheckingVoteState: false,
  } satisfies ThirstVoteEntryState,
}

export const thirstStateMocks = {
  empty: initialThirstState,
  matrixVotable: {
    byFeatureKey: { [THIRST_MOCK_FEATURE_KEY]: thirstEntryMocks.votable },
  } satisfies ThirstState,
  matrixVoted: {
    byFeatureKey: { [THIRST_MOCK_FEATURE_KEY]: thirstEntryMocks.voted },
  } satisfies ThirstState,
}
