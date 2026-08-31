import { HStack, IconButton } from '@chakra-ui/react'
import { FaUser } from 'react-icons/fa'
import { AppProviders } from '@/components/ui/app-providers'
import { ColorModeButton } from '@/components/ui/color-mode'
import { NavigationLayout } from '@/components/ui/navigation-layout'
import { Toaster } from '@/components/ui/toaster'

/**
 * The pre-parity surfaces' own provider tree.
 *
 * This is the wiring that used to live in the root layout, moved down one
 * level so it wraps ONLY the routes that still need it — `/`, `/session`,
 * `/settings`, `/integrations`. The parity shell under `(shell)` gets
 * `providers.tsx` instead, and Chakra never reaches it.
 *
 * Deleting this file is most of what KC-IS-#22 does when it retires these
 * surfaces; nothing else in the tree references it.
 */
export default function LegacyLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const actionBar = (
    <HStack>
      <ColorModeButton variant="subtle" size="xs" />
      <IconButton aria-label="Settings" size="xs" variant="subtle">
        <FaUser />
      </IconButton>
    </HStack>
  )

  return (
    <AppProviders>
      <NavigationLayout title="Kro" actionBar={actionBar}>
        {children}
      </NavigationLayout>
      <Toaster />
    </AppProviders>
  )
}
