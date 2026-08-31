import { Providers } from '../providers'
import { AppShellClient } from './AppShellClient'

/**
 * The parity shell's layout — a passive Server Component (`RC-41`).
 *
 * It wires the composition root around the shell and renders the destination
 * route inside it. No hook, no store read, no conditional: the two client
 * components below own everything stateful, and the destination arrives as
 * `children`.
 *
 * `isDevelopment` is read here because this is where the build configuration
 * exists. A platform-free tier has none (`@kro/core` compiles with
 * `types: []`), so canon's `#if DEBUG` — which gates the Tweak row — becomes a
 * value the composition root supplies, the same call `FeatureFlagBaseline`
 * already makes for `developmentActions`.
 */
export default function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Providers>
      <AppShellClient isDevelopment={process.env.NODE_ENV !== 'production'}>
        {children}
      </AppShellClient>
    </Providers>
  )
}
