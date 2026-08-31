import type { Preview } from '@storybook/nextjs'

/**
 * Global story configuration.
 *
 * No provider decorator yet on purpose: the app still renders through Chakra,
 * which the design-system child (#6) replaces with Tailwind + KroTokens. That
 * child owns the decorator, so wiring one here would only be thrown away.
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
