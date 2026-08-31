'use client'

import { Flex, VStack } from '@chakra-ui/react'
import { NavigationItem } from './navigation-item'
import { FiLink, FiSettings } from 'react-icons/fi'

export function NavigationSidebar() {
  return (
    <Flex
      as="nav"
      direction="column"
      width="263px"
      borderRightWidth={1}
      px={2}
      py={2}
      borderColor={{
        base: 'gray.300',
        _dark: 'gray.700',
      }}
    >
      {/*
        No Session row any more: KC-IS-#22 retired `/session` and the parity
        shell serves the surface at `/execute`. A row pointing at a route that
        404s is worse than no row, and this sidebar is the pre-parity one —
        linking out of it into the parity shell would be a one-way trip.
      */}
      <VStack alignItems="stretch" gap={0.5}>
        <NavigationItem
          href="/integrations"
          icon={FiLink}
          label="Integrations"
        />
        <NavigationItem href="/settings" icon={FiSettings} label="Settings" />
      </VStack>
    </Flex>
  )
}
