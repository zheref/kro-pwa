import { redirect } from 'next/navigation'

/**
 * `/settings` — a retired address, kept resolvable.
 *
 * The real surface is the Adjust destination inside the parity shell, so the
 * route stays — a bookmark or an old link must not 404 — and sends the visitor
 * there. A passive Server Component (`RC-38`): no hook, no store read, no
 * markup.
 *
 * KC-IS-#32 emptied the stub that used to live here; KC-IS-#79 moved the file
 * out of the `(legacy)` group when that group was deleted. Its behaviour has
 * not changed: the group only ever decided which providers wrapped the route,
 * and a redirect renders nothing to wrap.
 */
export default function SettingsRoute() {
  redirect('/adjust')
}
