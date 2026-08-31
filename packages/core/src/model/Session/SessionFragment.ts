/**
 * A fragment of a session.
 */
export interface SessionFragment {
    start: Date;
    end: Date | undefined;
}

/**
 * Returns true if the fragment has an end date.
 */
export function isFragmentCompleted(fragment: SessionFragment): boolean {
    return fragment.end !== undefined;
}

/**
 * Returns the duration of a fragment in milliseconds.
 * If the fragment is completed, it returns the difference between the end and start dates.
 * If the fragment is not completed, it returns the difference between the current date and the start date.
 */
export function durationOfFragment(fragment: SessionFragment, now: Date = new Date()): number {
    if (fragment.end) {
        return fragment.end.getTime() - fragment.start.getTime();
    } else {
        return now.getTime() - fragment.start.getTime();
    }
}