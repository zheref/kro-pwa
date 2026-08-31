import { Flex, Box } from "@chakra-ui/react";
import { NavigationHeader } from "./navigation-header";
import { NavigationSidebar } from "./navigation-sidebar";
import { ReactNode } from "react";

export interface NavigationLayoutProps {
  title: string;
  children: ReactNode;
  actionBar?: ReactNode;
}

export function NavigationLayout({ title, children, actionBar }: NavigationLayoutProps) {
  return (
    <Flex direction="column" height="100vh" bg={{
      base: "gray.100",
      _dark: "gray.900"
    }}>
      <NavigationHeader title={title} actionBar={actionBar} />
      <Flex flex="1" direction="row">
        <NavigationSidebar />
        <Box flex="1" alignContent="center">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
} 