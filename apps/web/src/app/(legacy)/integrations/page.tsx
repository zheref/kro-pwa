import { redirect } from 'next/navigation'

/**
 * `/integrations` — retired by KC-IS-#32.
 *
 * The stub it replaces said "This is the integrations page." The real surface is
 * the Integrations pane inside the Settings hub; there is no separate
 * destination for it in canon and there is none here, so the route redirects to
 * the hub rather than to a page that would have to explain itself.
 *
 * Same ownership note as `/settings`: the route file is #13's, its content is
 * this issue's, and the `(legacy)` group is retired wholesale by #22.
 */
export default function IntegrationsPage() {
  redirect('/adjust')
}
