"use client";

import { HeartFilledIcon } from "@/components/icons";
import { siteConfig } from "@/config/site";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import React, { createContext, useContext, ReactNode } from "react";

const DONATE_KEY = "asked-for-donate-at";

interface DonationContextProps {
  askForDonation: () => void;
}

const DonationContext = createContext<DonationContextProps | undefined>(undefined);

export const DonationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  const { isOpen, onClose, onOpen } = useDisclosure();

  const handleOpen = () => {
    const askedAtRaw = storage?.getItem(DONATE_KEY);
    const askedAt = askedAtRaw ? new Date(askedAtRaw) : null;

    const lang = document.getElementsByTagName("html")[0].getAttribute("lang");
    const isNonUk = Boolean(lang && !lang.includes("uk"));

    if (isNonUk && (!askedAt || new Date().getTime() - askedAt.getTime() > 1000 * 60 * 60 * 24 * 30)) {
      onOpen();
    }
  };
  const handleClose = () => {
    storage?.setItem(DONATE_KEY, new Date().toISOString());
    onClose();
  };

  return (
    <DonationContext.Provider value={{ askForDonation: handleOpen }}>
      {children}
      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalContent>
          <ModalHeader>Дружнє прохання</ModalHeader>
          <ModalBody className="max-h-96">
            <p>
              Качиний Інспектор ― це волонтерський проєкт, що не має жодного джерела фінансування. Все, що ви бачите на
              цьому сайті надається користувачам абсолютно безкоштовно.
            </p>
            <p>Регулярні та стабільні пожертви допомагають оплачувати сервіси, потрібні для роботи сайту.</p>
          </ModalBody>
          <ModalFooter>
            <Button
              as={Link}
              radius="full"
              color="primary"
              variant="bordered"
              className="w-full"
              startContent={<HeartFilledIcon className="text-danger" />}
              isExternal
              href={siteConfig.links.sponsor}
            >
              Підтримайте проєкт
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DonationContext.Provider>
  );
};

export const useDonation = (): DonationContextProps => {
  const context = useContext(DonationContext);
  if (!context) {
    throw new Error("useDonation must be used within a DonationProvider");
  }
  return context;
};
