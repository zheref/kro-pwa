/**
 * The platform tier's vocabulary, read off the **service manifest** rather than
 * imported from the Service modules that declare it.
 *
 * ## Why this file exists at all
 *
 * `packages/app/scripts/check-uzf-boundaries.mjs` enforces `RC-6`/`RC-21` by
 * refusing *any* feature-tier import of a module under `services/`:
 *
 * > `imports the Service module '…' — Services reach a Producer only through
 * > ThunkExtra (RC-6, RC-21)`
 *
 * That is the rule working as designed — it is what stops a Page reaching past
 * `ThunkExtra` to a live binding. But a Producer still has to *name* the values
 * it passes across that seam (which sound role, which permission state), and in
 * every other feature those names come from `@kro/core`, whose domain tier is
 * shared. These four are **web-platform** vocabulary, not Kro domain
 * vocabulary, and `@kro/core` is machine-enforced platform-free — a
 * `WakeLockSentinel` or a `BeforeInstallPromptEvent` has no business there.
 *
 * So the names are derived from `ThunkExtra` itself, which is exactly the seam
 * `RC-21` calls "the single, closed manifest of every injectable service".
 * There is one declaration site (the Service), one path across the boundary
 * (the manifest), and no copy to drift: change the Service's signature and
 * every use in this feature fails to compile.
 *
 * A UI child that needs these types imports them from **here**, not from
 * `services/`.
 */
import type { ThunkExtra } from '../../library/store'

/** Canon's `SessionSoundType` — the four session sound roles. */
export type SessionSoundRole = Parameters<
  ThunkExtra['audioFeedbackService']['play']
>[0]

/** `Notification.permission`, widened with `unsupported`. */
export type NotificationPermissionState = ReturnType<
  ThunkExtra['notificationsService']['permissionState']
>

/** Whether a programmatic PWA install is offerable right now. */
export type InstallAvailability = ReturnType<
  ThunkExtra['installService']['availability']
>

/** What raising the install prompt resolved to. */
export type InstallOutcome = Awaited<
  ReturnType<ThunkExtra['installService']['prompt']>
>

/** What one overdue-alert reconciliation pass did. */
export type OverdueAlertReconciliationReport = Awaited<
  ReturnType<ThunkExtra['notificationsService']['reconcileOverdueAlerts']>
>
