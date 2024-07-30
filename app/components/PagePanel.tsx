import { Avatar, Box, Heading, HStack, Text } from "@chakra-ui/react";

interface PagePanelProps {
  titleLabel?: string;
  title: string;
  description?: string;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ title, description, image, titleLabel }) => {
  return (
    <HStack justifyContent="space-between" alignItems="flex-start" minH="32">
      <HStack alignItems="flex-start">
        {image && <Avatar borderRadius="md" src={image} name={title || "Архів"} size="xl" />}
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
    </HStack>
  );
};

export default PagePanel;
