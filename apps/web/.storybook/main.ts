import type { StorybookConfig } from '@storybook/nextjs'

/**
 * Storybook — the `UZF-26` visual-evidence carrier for the web target.
 *
 * Deliberately story-less: every Page and Fragment brings its own
 * `*.stories.tsx` plus matching interaction/snapshot tests, so the globs below
 * match nothing until the design-system child lands. The wiring exists now so
 * those children only have to add files.
 */
const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/app/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
  core: {
    // No usage telemetry from a developer machine or from CI.
    disableTelemetry: true,
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
}

export default config
