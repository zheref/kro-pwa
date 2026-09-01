/**
 * The existing-local-data dialog — canon `MainScreen.swift:578` and the three
 * arms it sends to in `MainFeature.swift` (`migrationAlertSignAll`,
 * `migrationAlertClearAll`, `migrationAlertDismissed`).
 *
 * The dialog is the moment a person who has been using Kro signed-out gains an
 * account, and the choice is genuinely destructive in one direction, so the
 * semantics are pinned here as *data* rather than left implicit in a Producer:
 *
 * | Choice | Canon's arm | Local rows | Cloud |
 * |---|---|---|---|
 * | Sign All Endeavors to My Account | `migrationAlertSignAll` | stamped with the new `ownerUserId` and marked dirty (`adoptAnonymousData`) | pulled, and the adopted rows push on the next sweep |
 * | Clear Everything and Start Over | `migrationAlertClearAll` | dropped (`clearLocal`) | pulled |
 * | Cancel / dismiss | `migrationAlertDismissed` | **kept, and left anonymous** | pulled |
 *
 * ## Cancel keeps the rows *anonymous*, and that is canon
 *
 * Canon's dismiss arm comments *"Treat dismiss as 'keep local data' — user is
 * still signed in"* and then does exactly what the other two do afterwards
 * (`loadCoreData`) without adopting anything. So the rows stay owner-less: they
 * remain on the device, remain usable, and never sync. That is a real product
 * consequence — a user who cancels has local work that will not follow them —
 * and it is preserved rather than "improved", because silently adopting on
 * cancel would make Cancel indistinguishable from Sign All.
 *
 * ## When the dialog appears
 *
 * Canon's presentation predicate is `anonymousMigrationPendingUser != nil &&
 * !store.endeavors.isEmpty` — *any* local endeavor. Its own §9.5 note and the
 * repository operation it names (`countAnonymousOrphans`) say **anonymous
 * orphans**, and `MainFeature` never calls that operation. This port uses the
 * orphan count (`LocalStore.endeavors.countAnonymous()`), which is a
 * **deliberate divergence** recorded in the PR: "Sign All Endeavors to My
 * Account" adopts owner-less rows and nothing else, so showing the dialog for
 * a store whose rows are already owned offers a choice with no effect — and
 * "Clear Everything and Start Over" would then be offering to delete another
 * account's already-synced data. Using the count that matches what the buttons
 * do is the safer reading of the same intent.
 */

/** The three buttons, in canon's presentation order. */
export const LocalDataChoice = {
  /** "Sign All Endeavors to My Account" */
  signAll: 'signAll',
  /** "Clear Everything and Start Over" — destructive role. */
  clearAll: 'clearAll',
  /** "Cancel", and the swipe-to-dismiss path, which canon treats identically. */
  cancel: 'cancel',
} as const

export type LocalDataChoice =
  (typeof LocalDataChoice)[keyof typeof LocalDataChoice]

export const localDataChoices: readonly LocalDataChoice[] = [
  LocalDataChoice.signAll,
  LocalDataChoice.clearAll,
  LocalDataChoice.cancel,
]

/** What a choice does, as three independent facts a Producer can act on. */
export interface LocalDataDecision {
  /** Stamp every anonymous row with the new owner and mark it dirty. */
  readonly adoptsAnonymousRows: boolean
  /** Drop every local endeavor row. */
  readonly clearsLocalRows: boolean
  /** Pull the account's endeavors afterwards. All three arms do. */
  readonly pullsFromCloud: boolean
}

/** The decision table above, as a total function (`RC-9` closes it). */
export const localDataDecisionFor = (
  choice: LocalDataChoice,
): LocalDataDecision => {
  switch (choice) {
    case LocalDataChoice.signAll:
      return {
        adoptsAnonymousRows: true,
        clearsLocalRows: false,
        pullsFromCloud: true,
      }
    case LocalDataChoice.clearAll:
      return {
        adoptsAnonymousRows: false,
        clearsLocalRows: true,
        pullsFromCloud: true,
      }
    case LocalDataChoice.cancel:
      return {
        adoptsAnonymousRows: false,
        clearsLocalRows: false,
        pullsFromCloud: true,
      }
  }
}

/**
 * The copy canon shows, with the count interpolated:
 * *"You have N local endeavors. Associate them with your new account, or start
 * fresh?"*
 *
 * Ported here rather than left to #32 because the **count** is the part that
 * makes the choice informed, and it is derived from the same number that
 * decides whether the dialog appears at all. #32 owns the presentation; this
 * owns the sentence's truth.
 */
export const localDataDialogMessage = (count: number): string =>
  `You have ${count} local ${count === 1 ? 'endeavor' : 'endeavors'}. ` +
  'Associate them with your new account, or start fresh?'

/** Canon's title, for the same reason. */
export const LOCAL_DATA_DIALOG_TITLE = 'You Have Local Data'

/** *"…exactly when local data exists at sign-in"* — AC 2, as a predicate. */
export const shouldPresentLocalDataDialog = (anonymousCount: number): boolean =>
  anonymousCount > 0
