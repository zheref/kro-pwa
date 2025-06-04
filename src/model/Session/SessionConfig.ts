import { SessionPreset } from './SessionTypes';
import { seconds, minutes, hours, secondsFromMinutes } from '@/utils/durations';
import  '../../utils/numberEnhancements';

/**
 * Represents the mode of the session timer.
 */
export enum SessionTimerMode {
    Countdown = 'countdown',
    Stopwatch = 'stopwatch',
}

export function standardRestDurationFrom(duration: number): number {
    return Math.round(duration * (1 - 0.8334));
}

/**
 * Represents a session configuration.
 */
export interface ISessionConfig {
    // Title of the session
    title?: string;
    // Duration in seconds
    duration: number | undefined;
    // Rest duration in seconds
    rest: number;
    // Mode of the session
    mode: SessionTimerMode;
}

/**
 * Represents a session configuration.
 */
export class SessionConfig implements ISessionConfig {
    constructor(
        public duration: number | undefined,
        public rest: number = 0,
        public title?: string,
        public mode: SessionTimerMode = SessionTimerMode.Countdown
    ) {
        this.title = title ?? `${duration} seconds`;
        this.duration = duration;
        this.rest = rest;
        this.mode = mode;
    }

    get id(): string { return this.title ?? 'Untitled' }

    static readonly previewSession: ISessionConfig = new SessionConfig(
        seconds(60),
        0,
        'Preview Session'
    )

    static readonly testSession: ISessionConfig = new SessionConfig(
        minutes(2),
        0,
        'Test Session'
    )

    static readonly quickFocus: ISessionConfig = new SessionConfig(
        minutes(5),
        0,
        'Quick Focus'
    )

    static readonly defaultPomodoro: ISessionConfig = new SessionConfig(
        minutes(25),
        minutes(5),
        'Pomodoro'
    )

    static fromPreset(preset: SessionPreset): ISessionConfig {
        const duration = secondsFromMinutes(preset.minutes ?? 0)
        const rest = standardRestDurationFrom(duration)

        return new SessionConfig(
            duration,
            rest,
            preset.label
        );
    }

    static readonly presentConfigurations: ISessionConfig[] = [
        SessionConfig.quickFocus,
        SessionConfig.defaultPomodoro,
        new SessionConfig(minutes(50), minutes(10), 'Focus'),
        new SessionConfig(minutes(75), minutes(15), 'Momentum'),
        new SessionConfig(hours(3), minutes(60), 'Headspace'),
        new SessionConfig(0, 0, undefined, SessionTimerMode.Stopwatch)
    ]
}
