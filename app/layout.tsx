import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Container, VStack } from "@chakra-ui/react";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Качиний Інспектор",
  description: "Допоможе знайти архівні матеріали, які вже доступні онлайн",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body className={inter.className} style={{ backgroundColor: "lightgray" }}>
        <Providers>
          <Container maxW="container.xl" py={2}>
            <Header />
            <VStack
              as="main"
              justifyContent="space-between"
              alignItems="stretch"
              bg="white"
              p={2}
              mt={2}
              borderRadius="lg"
              minH="calc(100vh - var(--chakra-fontSizes-sm) - var(--chakra-space-2) * 6)"
            >
              {children}
            </VStack>
          </Container>
        </Providers>
      </body>
    </html>
  );
}
