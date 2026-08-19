"use client";

import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Link } from "@heroui/link";
import { EVENT_TIME, QUESTIONS_FORM_URL, STORAGE_KEY, YOUTUBE_EMBED_URL, YOUTUBE_URL } from "@/config/update-announce";

const UpdateAnnounceModal: React.FC = () => {
  const [isLive, setIsLive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      if (Date.now() >= EVENT_TIME) {
        setIsLive(true);

        return;
      }
      setIsOpen(!window.localStorage.getItem(STORAGE_KEY));
    };

    check();
    const interval = setInterval(check, 30_000);

    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setIsOpen(false);
  };

  if (isLive) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-5xl aspect-video">
          <a
            aria-label="Відкрити трансляцію на YouTube"
            className="block w-full h-full"
            href={YOUTUBE_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <iframe
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className="w-full h-full"
              src={YOUTUBE_EMBED_URL}
              title="Пряма трансляція великого оновлення"
            />
          </a>
        </div>
        <p className="text-white text-center mt-4 max-w-2xl text-sm md:text-base">
          Качиний Інспектор запрацює в оновленій версії по закінченню прямої трансляції
        </p>
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} size="xl" onClose={handleClose}>
      <ModalContent className="h-[500px]">
        <ModalHeader>Велике оновлення цієї пʼятниці!</ModalHeader>
        <ModalBody className="pb-6">
          <p>
            21 серпня 2026 о 18:30 (за Києвом) на каналі @spravnakachka відбудеться пряма трансляція з
            презентацією <span className="font-bold">Качиного Інспектора 2.0</span>
          </p>
          <p>
            Надсилайте ваші запитання автору через&nbsp;
            <Link isExternal href={QUESTIONS_FORM_URL}>
              Google Forms
            </Link>
          </p>
          <a
            aria-label="Відкрити трансляцію на YouTube"
            className="block w-full h-full"
            href={YOUTUBE_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <iframe
              className="w-full h-full pointer-events-none"
              src={YOUTUBE_EMBED_URL}
              tabIndex={-1}
              title="Пряма трансляція великого оновлення"
            />
          </a>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default UpdateAnnounceModal;
