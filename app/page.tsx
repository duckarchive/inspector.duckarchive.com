"use client";

import { useEffect, useState } from "react";
import { Archive } from "@prisma/client";
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  OrderedList,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import SearchPanel from "./components/SearchPanel";
import { IoWarning } from "react-icons/io5";
import { Link } from "@chakra-ui/next-js";

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
    <Modal isOpen={true} onClose={() => {}} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Перед початком роботи:</ModalHeader>
        <ModalBody>
          <OrderedList mb={4} lineHeight={1.2}>
            <ListItem mb={2}>
              Це &quot;Качиний Інспектор&quot; ― пошукова система архівних справ онлайн. Дозволяє одним запитом
              перевіряти наявність справи на всіх відомих джерелах.
            </ListItem>
            <ListItem mb={2}>
              Кінцева мета, це зробити пошук архівних справ максимально простим та зручним для кожного. Незалежно від
              того, чи ви юрист, адвокат, генеалог чи просто цікавитеся історією.
            </ListItem>
            <ListItem mb={2}>
              Проект повністю безкоштовний і розробка ведеться на волонтерських засадах однією людиною.
            </ListItem>
            <ListItem mb={2}>
              Розробка триває! Це значить наступне:
              <UnorderedList fontWeight="bold">
                <ListItem title="Наразі немає потреби повідомляти про знайдені проблеми. Розробник і так все знає і бачить, просто не має часу на все, і рухається згідно з власним планом. Відгуки будуть збиратись окремо, коли етап активної розробки буде завершено.">
                  можливі помилки та недоліки
                </ListItem>
                <ListItem>функції будуть додаватись</ListItem>
                <ListItem>джерела будуть додаватись</ListItem>
              </UnorderedList>
            </ListItem>
          </OrderedList>
        </ModalBody>

        <ModalFooter>
          <Button as={Link} href="/archives" colorScheme="teal">
            Зрозуміло
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
