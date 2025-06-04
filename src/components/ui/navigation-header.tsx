import { Flex, Box, Highlight } from "@chakra-ui/react";
import { ReactNode } from "react";

export interface NavigationHeaderProps {
  title: string;
  actionBar: ReactNode;
}

export function NavigationHeader({ title, actionBar }: NavigationHeaderProps) {
  const composedTitle = `${title} for Web`;

  return (
    <Flex 
        as="header" 
        width="100%" 
        align="center" 
        px={7} 
        py={3} 
        borderBottomWidth={1}
        justifyContent="space-between"
        borderColor={{
          base: "gray.300",
          _dark: "gray.700"
      }}
    >
      <Box fontWeight="semibold" color={{
        base: "gray.900",
        _dark: "gray.100"
      }}>
        <Highlight query="for Web" styles={{ color: "blue.500" }}>
            {composedTitle}
        </Highlight>
      </Box>
      {actionBar}
    </Flex>
  );
} 