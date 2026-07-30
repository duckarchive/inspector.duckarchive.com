"use client";

import { HeartFilledIcon } from "@/components/icons";
import { Link, Modal, useOverlayState } from "@heroui/react";
import config from "@duckarchive/framework/components/duck-nav/config.json";
import { useTranslations } from "next-intl";
import React, { createContext, useContext, ReactNode } from "react";

const DONATE_KEY = "asked-for-donate-at";

interface DonationContextProps {
  askForDonation: () => void;
}

const DonationContext = createContext<DonationContextProps | undefined>(undefined);

export const DonationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const t = useTranslations("donation-modal");
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  const state = useOverlayState();

  const handleOpen = () => {
    const askedAtRaw = storage?.getItem(DONATE_KEY);
    const askedAt = askedAtRaw ? new Date(askedAtRaw) : null;

    const lang = document.getElementsByTagName("html")[0].getAttribute("lang");
    const isNonUk = Boolean(lang && !lang.includes("uk"));

    if (isNonUk && (!askedAt || new Date().getTime() - askedAt.getTime() > 1000 * 60 * 60 * 24 * 30)) {
      state.open();
    }
  };
  const handleClose = () => {
    storage?.setItem(DONATE_KEY, new Date().toISOString());
    state.close();
  };

  return (
    <DonationContext.Provider value={{ askForDonation: handleOpen }}>
      {children}
      <Modal isOpen={state.isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t("header")}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-h-96">
                <p>{t("body-1")}</p>
                <p>{t("body-2")}</p>
              </Modal.Body>
              <Modal.Footer>
                <Link
                  href={config.links.sponsor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary button--md w-full justify-center rounded-full"
                >
                  <HeartFilledIcon className="text-danger" />
                  {t("cta")}
                </Link>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
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
