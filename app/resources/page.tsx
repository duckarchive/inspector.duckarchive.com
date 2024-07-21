"use client";

import React from "react";
import { Container, ListItem, Text, UnorderedList } from "@chakra-ui/react";
import { useResources } from "../contexts/Resources";

const AddMatch: React.FC = () => {
  const resources = useResources();

  return (
    <Container>
      <UnorderedList spacing={3}>
        {Object.values(resources).map((resource) => (
          <ListItem key={resource.id}>
            <Text>{resource.title}</Text>
          </ListItem>
        ))}
      </UnorderedList>
    </Container>
  );
};

export default AddMatch;
