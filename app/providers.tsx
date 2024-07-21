"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ResourcesProvider } from "./contexts/Resources";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider>
      <ResourcesProvider>{children}</ResourcesProvider>
    </ChakraProvider>
  );
}
