"use client";

import {
  Button,
  Icon,
  ListItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  OrderedList,
  Text,
  Tooltip,
  UnorderedList,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { Link } from "@chakra-ui/next-js";
import { NextPage } from "next";

const HomePage: NextPage = () => {
  const { isOpen, onClose } = useDisclosure({ defaultIsOpen: true });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Перед початком роботи:</ModalHeader>
        <ModalBody>
          <OrderedList mb={4} lineHeight={1.2}>
            <ListItem mb={4}>
              Це &quot;Качиний Інспектор&quot; ― пошукова система архівних справ онлайн. Дозволяє одним запитом
              перевіряти наявність справи на всіх відомих джерелах.
            </ListItem>
            <ListItem mb={4}>
              Кінцева мета, це зробити пошук архівних справ максимально простим та зручним для кожного. Незалежно від
              того, чи ви юрист, адвокат, генеалог чи просто цікавитеся історією.
            </ListItem>
            <ListItem mb={4}>
              Проект повністю безкоштовний і розробка ведеться на волонтерських засадах однією людиною.
            </ListItem>
          </OrderedList>
          <VStack bg="orange.100" p={2}>
            <Text fontWeight="bold">⚠️ РОЗРОБКА ТРИВАЄ ⚠️</Text>
            <UnorderedList>
              <ListItem mb={4}>
                <Text>можливі помилки та недоліки</Text>
                <Text fontSize="xs" fontStyle="italic">
                  Наразі немає потреби повідомляти про знайдені проблеми. Розробник і так все знає і бачить, просто не
                  має часу на все одразу. Відгуки будуть збиратись окремо, коли етап активної розробки буде завершено.
                </Text>
              </ListItem>
              <ListItem mb={4}>
                <Text>функції будуть додаватись</Text>
                <Text fontSize="xs" fontStyle="italic">
                  Якщо вам бракує якоїсь функції, це не означає, що її не буде. Просто вона ще не додана. Трохи
                  зачекайте.
                </Text>
              </ListItem>
              <ListItem mb={4}>
                <Text>джерела будуть додаватись</Text>
                <Text fontSize="xs" fontStyle="italic">
                  На сайті будуть не тільки Wiki та Archium. Додавання Family Search, babynyar.org, та сайтів самих
                  архівів вже є в планах.
                </Text>
              </ListItem>
            </UnorderedList>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} colorScheme="teal">
            Зрозуміло
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default HomePage;
