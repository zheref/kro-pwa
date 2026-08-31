/**
 * The platform-services barrel (`#34`).
 *
 * Re-export only — `library/store.ts` imports from here to assemble
 * `ThunkExtra`, and a test imports a `makeStubbed…` factory to build its own
 * binding. Nothing else may import this module: `check-uzf-boundaries.mjs`
 * fails the lint task on a feature-tier or component import of anything under
 * `services/` (`RC-6`, `RC-21`).
 */
export * from './audio/AudioFeedbackService'
// The web's stand-in for the macOS menu-bar extra (KC-IS-#21; KC-IS-#34 shipped
// no document-title binding, so the session lane declares it here beside the
// other platform boundaries).
export * from './documentTitle/DocumentTitleService'
export * from './install/InstallService'
export * from './notifications/NotificationsService'
export * from './notifications/OverdueAlertReconciliation'
export * from './vibration/VibrationService'
export * from './wakeLock/WakeLockService'
