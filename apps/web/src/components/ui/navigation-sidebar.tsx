"use client";

import { Flex, VStack } from "@chakra-ui/react";
import { NavigationItem } from "./navigation-item";
import { FiClock, FiLink, FiSettings } from "react-icons/fi";

export function NavigationSidebar() {
  return (
    <Flex as="nav" direction="column" width="263px" borderRightWidth={1} px={2} py={2} 
        borderColor={{
            base: "gray.300",
            _dark: "gray.700"
        }}
    >
      <VStack alignItems="stretch" gap={0.5}>
        <NavigationItem href="/session" icon={FiClock} label="Session" />
        <NavigationItem href="/integrations" icon={FiLink} label="Integrations" />
        <NavigationItem href="/settings" icon={FiSettings} label="Settings" />
      </VStack>
    </Flex>
  );
} 