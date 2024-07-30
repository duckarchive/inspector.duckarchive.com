"use client";

import { Center, Spinner, Text } from "@chakra-ui/react";

const funnyMessages = [
  "Качка може ходити, плавати і літати!",
  "Качку породи 'українська сіра' створювали на базі Українського НДІ птахівництва.",
  "Качки мають водонепроникне пір'я, що допомагає їм плавати.",
  "Качки можуть занурюватися під воду, щоб шукати їжу.",
  "Качки мають великі лапки, які допомагають їм рухатися по землі.",
  "Качки є соціальними тваринами і часто живуть у великих групах.",
  "Качки мають великі крила, які допомагають їм літати."
];

const Loader: React.FC = () => {
  return (
    <Center h="full" flexGrow={1} flexDirection="column">
      <Spinner size="xl" />
      <Text mt={2} textAlign="center">
        {funnyMessages[Math.floor(Math.random() * funnyMessages.length)]}
      </Text>
    </Center>
  );
};

export default Loader;
