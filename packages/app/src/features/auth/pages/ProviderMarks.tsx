'use client'

/**
 * The provider marks, drawn to each provider's own brand rules.
 *
 * Canon uses `SignInWithAppleButton` (Apple's own control, `.white` style) and
 * an `Image(systemName: "network")` for Google. Neither is available in a
 * browser: Apple ships no web control, and SF Symbols is not a web font. So the
 * marks are drawn here as inline SVG, which is also what both providers'
 * branding guidelines require on the web:
 *
 * - **Apple** — *Sign in with Apple* button: the Apple logo followed by the
 *   exact string "Sign in with Apple", the logo at the type's cap height, on a
 *   solid white or black field with the corner radius Apple specifies. The
 *   white variant is canon's (`.signInWithAppleButtonStyle(.white)`).
 * - **Google** — *Sign in with Google* button: the four-colour "G" on a white
 *   field, never recoloured, never on a coloured field, with the wordmark
 *   "Sign in with Google". The G's four path fills are the brand's own values
 *   and are the one place in this repo a literal hex is correct: they are the
 *   mark, not a theme.
 *
 * Both marks are `aria-hidden` — the button's own text is the accessible name,
 * so a screen reader hears "Sign in with Apple" once rather than twice.
 */

/** Apple's logo, drawn from Apple's own single-path outline. */
export function AppleMark({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      data-testid="apple-mark"
    >
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.26 3.02-.99.99-2.08 1.56-3.26 1.47-.02-.13-.03-.27-.03-.41 0-1.09.47-2.25 1.29-3.05.44-.44.98-.8 1.63-1.09.64-.28 1.25-.43 1.82-.45.01.17.02.34.02.51ZM20.5 17.1c-.33.77-.73 1.48-1.19 2.13-.63.89-1.15 1.5-1.55 1.84-.62.56-1.29.85-2 .87-.51 0-1.13-.15-1.85-.44-.72-.29-1.38-.44-1.99-.44-.63 0-1.31.15-2.04.44-.73.3-1.32.45-1.77.47-.68.03-1.36-.27-2.05-.9-.43-.37-.98-1-1.63-1.9-.7-.96-1.28-2.08-1.73-3.35C2.22 14.44 2 13.11 2 11.83c0-1.47.32-2.74.96-3.8.5-.85 1.17-1.53 2-2.02.83-.5 1.74-.75 2.71-.77.54 0 1.25.17 2.13.5.88.33 1.44.5 1.69.5.19 0 .82-.2 1.87-.59.99-.36 1.83-.51 2.52-.45 1.86.15 3.26.88 4.19 2.2-1.67 1.01-2.49 2.42-2.48 4.23.02 1.41.53 2.59 1.53 3.52.45.43.96.76 1.53.99-.12.36-.25.7-.39 1.03l-.01-.07Z" />
    </svg>
  )
}

/** Google's four-colour G. The four fills are the mark and are never themed. */
export function GoogleMark({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      data-testid="google-mark"
    >
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
      />
    </svg>
  )
}
