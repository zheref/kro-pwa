"use client";

import { Box, Icon, Text } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { IconType } from "react-icons";

interface NavigationItemProps {
  href: string;
  icon: IconType;
  label: string;
}

export function NavigationItem({ href, icon, label }: NavigationItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Box
        display="flex"
        alignItems="center"
        gap={3}
        px={4}
        py={2}
        borderRadius="4xl"
        cursor="pointer"
        _hover={{
          bg: {
            base: isActive ? "blue.700" : "gray.300",
            _dark: isActive ? "blue.700" : "gray.700"
          },
        }}
        bg={isActive ? "blue.500" : "transparent"}
        color={{
          base: isActive ? "white" : "gray.700",
          _dark: isActive ? "white" : "gray.300"
        }}
        transition="all 0.2s"
      >
        <Icon as={icon} boxSize={4} />
        <Text fontSize={14} fontWeight={isActive ? "semibold" : "normal"}>{label}</Text>
      </Box>
    </Link>
  );
} 