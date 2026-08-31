import { redirect } from 'next/navigation'

/**
 * `/settings` — retired by KC-IS-#32.
 *
 * This was a create-next-app-era stub ("This is the settings page."). The real
 * surface is the Adjust destination inside the parity shell, so the route stays
 * — a bookmark or an old link must not 404 — and redirects there permanently.
 *
 * The file itself belongs to the shell child's route tree (#13); what changes
 * here is only its content, which is what KC-IS-#32's lane covers. The `(legacy)`
 * group as a whole is retired by #22.
 */
export default function SettingsPage() {
  redirect('/adjust')
}
