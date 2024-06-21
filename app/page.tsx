"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Archive } from "@prisma/client";
import { Box, Container, Text } from "@chakra-ui/react";

export default function Home() {
  const [archives, setArchives] = useState<Archive[]>([]);

  useEffect(() => {
    const fetchArchives = async () => {
      const response = await fetch("/api/archives");
      const data = await response.json();
      setArchives(data);
    };

    fetchArchives();
  }, []);

  return (
    <Container>
      {archives.map((archive) => (
        <Box key={archive.id}>
          <Text>{archive.title}</Text>
        </Box>
      ))}
    </Container>
  );
}
