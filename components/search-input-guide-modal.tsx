"use client";

import { Accordion, Chip, Link, Modal } from "@heroui/react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { FaCheck, FaInfoCircle, FaTimes } from "react-icons/fa";

interface SearchInputGuideModalProps {
  withoutTitle?: boolean;
}

const SearchInputGuideModal: React.FC<SearchInputGuideModalProps> = ({ withoutTitle }) => {
  const t = useTranslations("search-guide");

  return (
    <Modal>
      <Modal.Trigger
        className="flex justify-between gap-2 items-center cursor-pointer opacity-70 hover:opacity-100"
        aria-label={t("trigger-aria")}
      >
        {!withoutTitle && <p className="text-sm">{t("trigger-label")}</p>}
        <FaInfoCircle className="text-lg shrink-0" />
      </Modal.Trigger>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="pb-0">
              <Modal.Heading>{t("title")}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Accordion defaultExpandedKeys={["1"]}>
                <Accordion.Item id="1">
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      {t("format-title")}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>
                      <p className="text-gray-600 text-sm mb-2 bg-amber-100 p-2 rounded-md">
                        {t("format-note")}&nbsp;
                        <NextLink href="/search" className="link text-sm">
                          {t("format-note-link")}
                        </NextLink>
                      </p>
                      <p className="text-gray-600 text-sm mb-2">{t("format-intro")}</p>

                      <div className="flex gap-1 w-full justify-around items-center text-center">
                        <div>
                          <p className="text-lg md:text-3xl">ДАХмО</p>
                          <p className="text-gray-600 text-xs hidden md:inline">{t("part-archive")}</p>
                          <p className="text-gray-600 text-xs inline md:hidden">{t("part-archive-short")}</p>
                        </div>
                        <div>
                          <p className="text-lg md:text-3xl">-</p>
                          <p className="text-gray-600 text-xs hidden md:inline">{t("part-dash")}</p>
                          <p className="text-gray-600 text-xs inline md:hidden">-</p>
                        </div>
                        <div>
                          <p className="text-lg md:text-3xl">Р6193</p>
                          <p className="text-gray-600 text-xs hidden md:inline">{t("part-fond")}</p>
                          <p className="text-gray-600 text-xs inline md:hidden">{t("part-fond-short")}</p>
                        </div>
                        <div>
                          <p className="text-lg md:text-3xl">-</p>
                          <p className="text-gray-600 text-xs hidden md:inline">{t("part-dash")}</p>
                          <p className="text-gray-600 text-xs inline md:hidden">-</p>
                        </div>
                        <div>
                          <p className="text-lg md:text-3xl">12</p>
                          <p className="text-gray-600 text-xs hidden md:inline">{t("part-inventory")}</p>
                          <p className="text-gray-600 text-xs inline md:hidden">{t("part-inventory-short")}</p>
                        </div>
                        <div>
                          <p className="text-lg md:text-3xl">-</p>
                          <p className="text-gray-600 text-xs hidden md:inline">{t("part-dash")}</p>
                          <p className="text-gray-600 text-xs inline md:hidden">-</p>
                        </div>
                        <div>
                          <p className="text-lg md:text-3xl">321А</p>
                          <p className="text-gray-600 text-xs hidden md:inline">{t("part-file")}</p>
                          <p className="text-gray-600 text-xs inline md:hidden">{t("part-file-short")}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">{t("examples")}</p>
                      <ul className="list-none list-inside space-y-1 text-sm font-mono my-2">
                        <li>ЦДІАК-127-1078-796</li>
                        <li>ДАХмО-Р6193-1-2451</li>
                        <li>ДАКрО-20-1-164</li>
                      </ul>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item id="2">
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      {t("scope-title")}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>
                      <p className="text-gray-600 text-sm mb-2">{t("scope-p1")}</p>
                      <p className="text-gray-600 text-sm mb-2">{t("scope-p2")}</p>
                      <ul className="list-disc list-inside space-y-0">
                        <li>
                          <Link href="https://www.custos.online/" target="_blank" rel="noopener noreferrer" className="text-sm">
                            {t("link-custos")}
                            <Link.Icon />
                          </Link>
                        </li>
                        <li>
                          <Link href="https://ridni.org/" target="_blank" rel="noopener noreferrer" className="text-sm">
                            {t("link-ridni")}
                            <Link.Icon />
                          </Link>
                        </li>
                      </ul>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item id="3">
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      {t("letters-title")}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>
                      <p className="text-gray-600 text-sm mb-2">{t("letters-p1")}</p>
                      <p className="text-gray-600 text-sm mt-2">{t("letters-r-fonds")}</p>
                      <div className="flex gap-1 flex-wrap">
                        <Chip color="success">
                          <FaCheck size={18} />
                          Р6193
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          Р-6193
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          Р 6193
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          р 6193
                        </Chip>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">{t("letters-subcodes")}</p>

                      <div className="flex gap-1 flex-wrap">
                        <Chip color="success">
                          <FaCheck size={18} />
                          10А
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          10-А
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          10 А
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          10 а
                        </Chip>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">{t("letters-volumes")}</p>
                      <div className="flex gap-1 flex-wrap">
                        <Chip color="success">
                          <FaCheck size={18} />
                          3Т1
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />3 том 1
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          3-1
                        </Chip>
                        <Chip color="danger">
                          <FaTimes size={18} />
                          3-т-1
                        </Chip>
                      </div>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item id="4">
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      {t("partial-title")}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>
                      <p className="text-gray-600 text-sm mb-2">{t("partial-p1")}</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>
                          <span className="font-mono">ДАХмО</span>
                          <ul className="pl-6 list-disc list-inside space-y-1 text-sm">
                            <li>ДАХмО-1-1-1</li>
                            <li>ДАХмО-999-999-999</li>
                          </ul>
                        </li>
                        <li>
                          <span className="font-mono">ДАХмО-1-1</span>
                          <ul className="pl-6 list-disc list-inside space-y-1 text-sm">
                            <li>ДАХмО-1-1-1</li>
                            <li>ДАХмО-1-1-999</li>
                          </ul>
                        </li>
                        <li>
                          <span className="font-mono">ДАХмО--1</span>
                          <ul className="pl-6 list-disc list-inside space-y-1 text-sm">
                            <li>ДАХмО-1-1-1</li>
                            <li>ДАХмО-1-999-1</li>
                          </ul>
                        </li>
                        <li>
                          <span className="font-mono">ДАХмО---123</span>
                          <ul className="pl-6 list-disc list-inside space-y-1 text-sm">
                            <li>ДАХмО-1-1-123</li>
                            <li>ДАХмО-999-999-123</li>
                          </ul>
                        </li>
                        <li>
                          <span className="font-mono">---123</span>
                          <ul className="pl-6 list-disc list-inside space-y-1 text-sm">
                            <li>ДАХмО-1-1-123</li>
                            <li>ЦДІАК-999-999-123</li>
                          </ul>
                        </li>
                      </ul>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item id="5">
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      {t("symbols-title")}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>
                      <p className="text-gray-600 text-sm mb-2">{t("symbols-p1")}</p>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default SearchInputGuideModal;
