'use client'

import { Provider as ChakraProvider } from '@/components/ui/provider'
import { ColorModeProvider } from '@/components/ui/color-mode'
import { Global } from '@emotion/react'

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * NextAuth's `SessionProvider` used to wrap this tree and carry a server-read
 * session down to `useSession`. KC-IS-#31 retires NextAuth: Kro Cloud auth is
 * Supabase now, and the session lives in the `auth` slice of `@kro/app`'s store.
 *
 * No store provider is wired here yet — the composition root that calls
 * `makeStore(...)` and mounts `StoreProvider` is the shell child's (KC-IS-#13),
 * and adding one here would put a second store-construction site in the repo
 * (`RC-22`, `RC-41`). This component is therefore theme-and-styles only until
 * that child lands.
 */
export function AppProviders({ children }: ProvidersProps) {
  return (
    <>
      <Global
        styles={`
          html, body, #__next {
            height: 100%;
            min-height: 100%;
            width: 100vw;
            overflow: auto;
            margin: 0;
            padding: 0;
          }
          body {
            box-sizing: border-box;
          }
        `}
      />
      <ChakraProvider>
        <ColorModeProvider>{children}</ColorModeProvider>
      </ChakraProvider>
    </>
  )
}
