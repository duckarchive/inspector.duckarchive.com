import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

interface PagePanelProps extends PropsWithChildren {
  titleLabel?: string;
  title: string;
  description?: string;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ title, description, titleLabel, children }) => {
  return (
    <HStack justifyContent="space-between" alignItems="flex-start" minH="20">
      <HStack alignItems="flex-start">
        <Box>
          {titleLabel && (
            <Text color="gray.500" flexShrink={0}>
              {titleLabel}:
            </Text>
          )}
          <Heading as="h1" size="md" lineHeight={1}>
            {title}
          </Heading>
          {description && <Text fontSize="lg">{description}</Text>}
        </Box>
      </HStack>
      {children}
    </HStack>
  );
};

export default PagePanel;
