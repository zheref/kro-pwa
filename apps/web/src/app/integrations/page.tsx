import { redirect } from 'next/navigation'

/**
 * `/integrations` — a retired address, kept resolvable.
 *
 * Calendar-connect is a **pane inside the Settings hub**, not a destination of
 * its own: `SettingsSection` registers it as `SettingsSectionId.integrations`
 * within the hub `/adjust` mounts, and nothing in the shell's route map
 * addresses it separately (KC-IS-#33 landed the Google surface there, and
 * `GoogleCalendar.md` names "Integrations" as the place you connect). So this
 * address resolves to the hub rather than to a page that would have to explain
 * why it is empty.
 *
 * Same story as `/settings`: KC-IS-#32 emptied the stub, KC-IS-#79 moved the
 * file out of the deleted `(legacy)` group. A passive Server Component
 * (`RC-38`) and nothing more.
 */
export default function IntegrationsRoute() {
  redirect('/adjust')
}
