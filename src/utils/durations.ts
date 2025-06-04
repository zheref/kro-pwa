export function seconds(value: number): number {
    return value * 1000;
}

export function minutes(value: number): number {
    return value * 60 * 1000;
}

export function hours(value: number): number {
    return value * 60 * 60 * 1000;
}

/**
 * Formats a duration in milliseconds to a string of days.
 * @param value - The duration in milliseconds.
 * @returns A string of days.
 */
export function days(value: number): number {
    return value * 24 * 60 * 60 * 1000;
}

/**
 * Formats a duration in milliseconds to a string of days, weeks, and months.
 * @param duration - The duration in milliseconds.
 * @returns A string of days, weeks, and months.
 */
export function weeks(value: number): number {
    return value * 7 * 24 * 60 * 60 * 1000;
}

/**
 * Formats a duration in milliseconds to a string of days, weeks, and months.
 * @param duration - The duration in milliseconds.
 * @returns A string of days, weeks, and months.
 */
export function months(value: number): number {
    return value * 30 * 24 * 60 * 60 * 1000;
}

/**
 * Formats a duration in milliseconds to a string of years.
 * @param value - The duration in milliseconds.
 * @returns A string of years.
 */
export function years(value: number): number {
    return value * 365 * 24 * 60 * 60 * 1000;
}

/**
 * Formats a duration in milliseconds to a string of minutes and seconds.
 * @param duration - The duration in milliseconds.
 * @returns A string of minutes and seconds.
 */
export function formatDuration(duration: number): string {
    const totalMinutes = Math.floor(duration / (60 * 1000));
    const totalSeconds = Math.floor(duration / 1000);

    if (totalMinutes > 0) {
        const minutes = totalMinutes;
        const seconds = Math.floor((duration % (60 * 1000)) / 1000);
        return `${minutes}m ${seconds}s`;
    } else {
        return `${totalSeconds}s`;
    }
}

export function secondsFromMinutes(minutes: number): number {
    return minutes * 60;
}

export function minutesFromSeconds(seconds: number): number {
    return seconds / 60;
}

export function hoursFromMinutes(minutes: number): number {
    return minutes / 60;
}

export function daysFromHours(hours: number): number {
    return hours / 24;
}

export function weeksFromDays(days: number): number {
    return days / 7;
}

export function digitalTime(date: Date, includeSeconds: boolean = false): string {
    return date.toLocaleTimeString(
        [], 
        { hour: '2-digit', minute: '2-digit', second: includeSeconds ? '2-digit' : undefined }
    );
}

export function sumDurations(durations: number[]): number {
    return durations.reduce((acc, duration) => acc + duration, 0);
}

export function dateAddingDuration(date: Date, duration: number): Date {
    return new Date(date.getTime() + duration * 1000);
}

export function dateSubtractingDuration(date: Date, duration: number): Date {
    return new Date(date.getTime() - duration * 1000);
}