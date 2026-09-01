import '../src/app/globals.css'
import type { Preview } from '@storybook/nextjs'

/**
 * Global story configuration.
 *
 * The one import above is the whole point of this file: it pulls in Tailwind
 * and the Kro design system, so a story renders against exactly the stylesheet
 * the app ships. Without it every token utility and every `kro-*` class is
 * inert and the gallery shows unstyled markup.
 *
 * Still no provider decorator. Design-system components are presentation only
 * (`RC-14`) and take no store; the shell child (#13) owns the app-level
 * providers. Chakra was deliberately absent here so nothing new could quietly
 * start depending on it while it was still installed; KC-IS-#79 uninstalled
 * it, so its absence is no longer a choice this file has to keep making.
 *
 * No theme toolbar either. Every story that needs both schemes renders them
 * SIDE BY SIDE, which is what the tokens' `[data-theme]` attribute selectors
 * make possible. A global toggle would show one scheme at a time and turn
 * "does this pair still read?" into a memory test.
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
