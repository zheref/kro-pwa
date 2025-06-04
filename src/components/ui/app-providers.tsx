'use client'

import { Provider as ChakraProvider } from '@/components/ui/provider'
import { ColorModeProvider } from '@/components/ui/color-mode'
import { Global } from '@emotion/react'
import { SessionProvider } from 'next-auth/react'

interface ProvidersProps {
    session: any
    children: React.ReactNode
}

export function AppProviders({ session, children }: ProvidersProps) {
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
        <SessionProvider session={session}>
            <ChakraProvider>
                <ColorModeProvider>
                    {children}
                </ColorModeProvider>
            </ChakraProvider>
        </SessionProvider>
    </>
  )
} 