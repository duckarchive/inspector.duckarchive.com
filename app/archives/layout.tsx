import { Container } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

const ArchivesLayout: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <Container maxW="container.xl" py={10}>
      {children}
    </Container>
  );
};

export default ArchivesLayout;
