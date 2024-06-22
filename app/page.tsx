"use client";

import { useEffect, useState } from "react";
import { Archive } from "@prisma/client";
import { Box, Container, Text } from "@chakra-ui/react";
import SearchPanel from "./components/SearchPanel";

export default function Home() {
  const [archives, setArchives] = useState<Archive[]>([]);

  // useEffect(() => {
  //   const fetchArchives = async () => {
  //     const response = await fetch("/api/archives");
  //     const data = await response.json();
  //     setArchives(data);
  //   };

  //   fetchArchives();
  // }, []);

  return (
    <Container>
      <SearchPanel />
    </Container>
  );
}
