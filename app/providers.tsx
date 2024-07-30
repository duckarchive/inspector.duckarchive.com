"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ResourcesProvider } from "./contexts/Resources";
import theme from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <ResourcesProvider>{children}</ResourcesProvider>
    </ChakraProvider>
  );
}
