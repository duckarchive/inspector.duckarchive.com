import { Accordion, Chip, Link, Modal } from "@heroui/react";
import NextLink from "next/link";
import { FaCheck, FaInfoCircle, FaTimes } from "react-icons/fa";

interface SearchInputGuideModalProps {
  withoutTitle?: boolean;
}

const SearchInputGuideModal: React.FC<SearchInputGuideModalProps> = ({ withoutTitle }) => (
  <Modal>
    <Modal.Trigger
      className="flex justify-between gap-2 items-center cursor-pointer opacity-70 hover:opacity-100"
      aria-label="Відкрити інструкцію"
    >
      {!withoutTitle && <p className="text-sm">Як шукати?</p>}
      <FaInfoCircle className="text-lg shrink-0" />
    </Modal.Trigger>
    <Modal.Backdrop>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="pb-0">
            <Modal.Heading>Довідка</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Accordion defaultExpandedKeys={["1"]}>
              <Accordion.Item id="1">
                <Accordion.Heading>
                  <Accordion.Trigger>
                    Формат
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <p className="text-gray-600 text-sm mb-2 bg-amber-100 p-2 rounded-md">
                      Це довідка про формат вводу в поле Швидкого пошуку. Для розширеного пошуку слід використовувати
                      форму на&nbsp;
                      <NextLink href="/search" className="link text-sm">
                        сторінці пошуку
                      </NextLink>
                    </p>
                    <p className="text-gray-600 text-sm mb-2">Вводити реквізити слід у форматі:</p>

                    <div className="flex gap-1 w-full justify-around items-center text-center">
                      <div>
                        <p className="text-lg md:text-3xl">ДАХмО</p>
                        <p className="text-gray-600 text-xs hidden md:inline">код архіву</p>
                        <p className="text-gray-600 text-xs inline md:hidden">архів</p>
                      </div>
                      <div>
                        <p className="text-lg md:text-3xl">-</p>
                        <p className="text-gray-600 text-xs hidden md:inline">дефіс</p>
                        <p className="text-gray-600 text-xs inline md:hidden">-</p>
                      </div>
                      <div>
                        <p className="text-lg md:text-3xl">Р6193</p>
                        <p className="text-gray-600 text-xs hidden md:inline">код фонду</p>
                        <p className="text-gray-600 text-xs inline md:hidden">фонд</p>
                      </div>
                      <div>
                        <p className="text-lg md:text-3xl">-</p>
                        <p className="text-gray-600 text-xs hidden md:inline">дефіс</p>
                        <p className="text-gray-600 text-xs inline md:hidden">-</p>
                      </div>
                      <div>
                        <p className="text-lg md:text-3xl">12</p>
                        <p className="text-gray-600 text-xs hidden md:inline">код опису</p>
                        <p className="text-gray-600 text-xs inline md:hidden">опис</p>
                      </div>
                      <div>
                        <p className="text-lg md:text-3xl">-</p>
                        <p className="text-gray-600 text-xs hidden md:inline">дефіс</p>
                        <p className="text-gray-600 text-xs inline md:hidden">-</p>
                      </div>
                      <div>
                        <p className="text-lg md:text-3xl">321А</p>
                        <p className="text-gray-600 text-xs hidden md:inline">код справи</p>
                        <p className="text-gray-600 text-xs inline md:hidden">справа</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">Приклади:</p>
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
                    Пошук відбувається виключно за реквізитами справи
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <p className="text-gray-600 text-sm mb-2">
                      Качиний Інспектор не ставить перед собою задачі по каталогізації справ, і заточений виключно на
                      перевірку наявності справ онлайн на тих чи інших джерелах. Тому він не орієнтований на збір іншої
                      інформації окрім реквізитів справи.
                    </p>
                    <p className="text-gray-600 text-sm mb-2">
                      Для пошуку реквізитів справи за населеним пунктом, часовим проміжком або назвою слід
                      використовувати каталоги архівів, або інші ресурси, наприклад:
                    </p>
                    <ul className="list-disc list-inside space-y-0">
                      <li>
                        <Link href="https://www.custos.online/" target="_blank" rel="noopener noreferrer" className="text-sm">
                          Проєкт &quot;Кусто́ш&quot;
                          <Link.Icon />
                        </Link>
                      </li>
                      <li>
                        <Link href="https://ridni.org/" target="_blank" rel="noopener noreferrer" className="text-sm">
                          Проєкт &quot;Рідні&quot;
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
                    Реквізити з літерами (фонди Р та інше)
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <p className="text-gray-600 text-sm mb-2">
                      Всі літерні реквізити слід вводити великими літерами без пробілів та дефісів.
                    </p>
                    <p className="text-gray-600 text-sm mt-2">Р-фонди</p>
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
                    <p className="text-gray-600 text-sm mt-2">Підфонди/описи/справи</p>

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
                    <p className="text-gray-600 text-sm mt-2">Томи/розділи</p>
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
                    Частковий пошук
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <p className="text-gray-600 text-sm mb-2">
                      Для часткового пошуку слід пропускати невідому частину реквізиту, наприклад:
                    </p>
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
                    Символи
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <p className="text-gray-600 text-sm mb-2">
                      Для пошуку слід використовувати кириличні літери, цифри та дефіси.
                    </p>
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

export default SearchInputGuideModal;
