/**
 * Tailwind CSS v4 wiring.
 *
 * v4 has no `tailwind.config.js`: the theme is declared in CSS with `@theme`,
 * and content is discovered automatically plus whatever `@source` names — see
 * `src/app/globals.css`. This file exists only to put Tailwind in the PostCSS
 * chain, which is how Next.js and Storybook both pick it up.
 *
 * No `autoprefixer`: Tailwind v4 handles vendor prefixing itself, and adding
 * it back would prefix twice.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
