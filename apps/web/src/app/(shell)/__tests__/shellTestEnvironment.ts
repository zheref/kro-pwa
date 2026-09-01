/**
 * The one browser capability the parity shell needs and jsdom does not have.
 *
 * `useSurfaceLayout` resolves the shell's shape from `matchMedia` plus
 * `innerWidth`, so any spec that mounts `MainShellPage` — directly, or through
 * a route wrapper — has to install both. Three specs did it with three
 * byte-identical copies of this block; it lives here now, under `__tests__/`,
 * because it is scaffolding rather than shipped code.
 *
 * The defaults describe a desktop window, which is the shape every current
 * caller wants. A spec that needs the tab-bar shell passes a narrower width.
 */

type Listener = () => void

export function installShellMatchMedia(width = 1440): void {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  })

  window.matchMedia = ((query: string) =>
    ({
      // `(pointer: coarse)` stays false — the desktop shell — and the width
      // queries answer from the value installed above, so a caller changes the
      // shape by changing one number rather than by restating the stub.
      matches: query.includes('min-width') ? width >= 768 : false,
      media: query,
      addEventListener: (_: string, __: Listener) => {},
      removeEventListener: (_: string, __: Listener) => {},
      addListener: (_: Listener) => {},
      removeListener: (_: Listener) => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}
