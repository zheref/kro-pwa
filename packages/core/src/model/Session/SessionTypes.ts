import { SessionFragment } from "./SessionFragment";
import { ISessionConfig } from "./SessionConfig";

export enum FragmentFocusStatus {
    running = 'running',
    paused = 'paused'
}

export abstract class SessionStatus {
    static ready: SessionStatus;
    static focused(status: FragmentFocusStatus): SessionStatus {
        return new SessionStatusFocused(status);
    }
}

export class SessionStatusReady extends SessionStatus { }

export class SessionStatusFocused extends SessionStatus {
    constructor(public status: FragmentFocusStatus) {
        super();
    }
}

SessionStatus.ready = new SessionStatusReady();

export interface SessionFragmentState {
    intention: string;
    targetConfig: ISessionConfig;
    status: SessionStatus;
    isCalendarConfigured: boolean;
    isHardEditing: boolean;
    fragments: SessionFragment[];
    presentingFailure: Error | null;
}

export interface SessionPreset {
    key: string;
    label: string;
    minutes?: number;
}
