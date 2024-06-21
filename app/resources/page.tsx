"use client";

import React, { useEffect, useState } from "react";
import { Container, ListItem, Text, UnorderedList } from "@chakra-ui/react";
import { Resource } from "@prisma/client";

const AddMatch: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    const fetchResources = async () => {
      const response = await fetch("/api/resources");
      const data = await response.json();
      setResources(data);
    };

    fetchResources();
  }, []);

  return (
    <Container>
      <UnorderedList spacing={3}>
        {resources.map((resource) => (
          <ListItem key={resource.id}>
            <Text>{resource.title}</Text>
          </ListItem>
        ))}
      </UnorderedList>
    </Container>
  );
};

export default AddMatch;
