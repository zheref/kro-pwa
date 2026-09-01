/**
 * The web app manifest — Kro's identity, not the Next.js template's.
 *
 * Every field here is either an installability requirement or a value taken
 * from canon; nothing is decorative:
 *
 * - **`id`** pins the app's identity across deploys. Without it the browser
 *   derives identity from `start_url`, so a later change to the start route
 *   would look like a *different* app and orphan every existing install.
 * - **`start_url` stays `/`, which redirects.** Since KC-IS-#79 `/` is a
 *   passive redirect into the shell's landing destination rather than a page.
 *   A launch therefore costs one in-scope hop, which is deliberate: `/` is the
 *   app's front door, and pinning `start_url` to whichever destination is
 *   currently the landing one would have to be re-decided every time that
 *   product call changes. In-scope redirects do not affect installability, and
 *   `id` already carries identity, so this is a free choice rather than a
 *   constrained one. The offline half is the service worker's, and it does NOT
 *   precache `/` — see `SHELL_DOCUMENT` in `public/sw.js`.
 * - **`theme_color`** is `--kro-color-header-gradient-indigo` (`#5856d6`), the
 *   first stop of canon's `indigoGrape` header slab, so the browser/OS chrome
 *   continues the header rather than fighting it.
 * - **`background_color`** is `--kro-color-back` (`#fafafa`), the page behind
 *   grouped cards, so the splash screen is the surface the app opens onto.
 *   Both values are the literals from `packages/app/src/design/system/tokens/
 *   tokens.css`; a manifest cannot read a CSS custom property, so this is the
 *   one place they are necessarily restated, and it is noted here rather than
 *   left to be discovered.
 * - **Two `purpose`s per icon.** `any` is the plain icon; `maskable` lets
 *   Android crop it to the launcher's shape instead of putting a white box
 *   around it. Declaring both on one entry is how a single asset serves both.
 *
 * Installability (a Chromium install prompt, and the Lighthouse PWA audit)
 * needs: this manifest with `name`/`short_name`, a `start_url`, a `display` of
 * `standalone` or better, a 192px and a 512px icon, a registered service worker
 * with a fetch handler, and HTTPS. The worker is `apps/web/public/sw.js`;
 * registration is `apps/web/src/progressive/registerServiceWorker.ts`.
 */
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Kro — control your time',
    short_name: 'Kro',
    description:
      'Control your time, do not let time control you. Plan, Do and Earn, ' +
      'in one personal execution system.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fafafa',
    theme_color: '#5856d6',
    categories: ['productivity', 'utilities'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/icons/Kro192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/Kro192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/Kro512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/Kro512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
