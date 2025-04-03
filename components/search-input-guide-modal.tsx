import { Modal, ModalBody, ModalContent, ModalHeader, useDisclosure } from "@heroui/modal";
import { Link } from "@heroui/link";
import { Chip } from "@heroui/chip";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { FaCheck, FaInfoCircle, FaTimes } from "react-icons/fa";

interface SearchInputGuideModalProps {
  withoutTitle?: boolean;
}

const SearchInputGuideModal: React.FC<SearchInputGuideModalProps> = ({ withoutTitle }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleInfoClick = () => {
    onOpen();
  };

  return (
    <>
      <div
        className="flex justify-between gap-2 items-center cursor-pointer text-default-400 hover:text-default-800 cursor-pointer"
        aria-label="Відкрити інструкцію"
        onClick={handleInfoClick}
      >
        {!withoutTitle && <p className="text-sm">Як шукати?</p>}
        <FaInfoCircle className="text-lg flex-shrink-0" />
      </div>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalContent>
          <ModalHeader className="pb-0">Довідка</ModalHeader>
          <ModalBody>
            <Accordion defaultSelectedKeys={["1"]} isCompact>
              <AccordionItem key="1" title="Формат">
                <p className="text-gray-600 text-sm mb-2 bg-amber-100 p-2 rounded-md">
                  Це довідка про формат вводу в поле Швидкого пошуку. Для розширеного пошуку слід використовувати форму
                  на&nbsp;
                  <Link href="/search" className="text-sm">
                    сторінці пошуку
                  </Link>
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
              </AccordionItem>
              <AccordionItem key="2" title="Пошук відбувається виключно за реквізитами справи">
                <p className="text-gray-600 text-sm mb-2">
                  Качиний Інспектор не ставить перед собою задачі по каталогізації справ, і заточений виключно на
                  перевірку наявності справ онлайн на тих чи інших джерелах. Тому він не орієнтований на збір іншої
                  інформації окрім реквізитів справи.
                </p>
                <p className="text-gray-600 text-sm mb-2">
                  Для пошуку реквізитів справи за населеним пунктом, часовим проміжком або назвою слід використовувати
                  каталоги архівів, або інші ресурси, наприклад:
                </p>
                <ul className="list-disc list-inside space-y-0">
                  <li>
                    <Link href="https://www.custos.online/" className="text-sm">
                      Проєкт &quot;Кусто́ш&quot;
                    </Link>
                  </li>
                  <li>
                    <Link href="https://ridni.org/" className="text-sm">
                      Проєкт &quot;Рідні&quot;
                    </Link>
                  </li>
                </ul>
              </AccordionItem>
              <AccordionItem key="3" title="Реквізити з літерами (фонди Р та інше)">
                <p className="text-gray-600 text-sm mb-2">
                  Всі літерні реквізити слід вводити великими літерами без пробілів та дефісів.
                </p>
                <p className="text-gray-600 text-sm mt-2">Р-фонди</p>
                <div className="flex gap-1 flex-wrap">
                  <Chip startContent={<FaCheck size={18} />} color="success">
                    Р6193
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    Р-6193
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    Р 6193
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    р 6193
                  </Chip>
                </div>
                <p className="text-gray-600 text-sm mt-2">Підфонди/описи/справи</p>

                <div className="flex gap-1 flex-wrap">
                  <Chip startContent={<FaCheck size={18} />} color="success">
                    10А
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    10-А
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    10 А
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    10 а
                  </Chip>
                </div>
                <p className="text-gray-600 text-sm mt-2">Томи/розділи</p>
                <div className="flex gap-1 flex-wrap">
                  <Chip startContent={<FaCheck size={18} />} color="success">
                    3Т1
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    3 том 1
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    3-1
                  </Chip>
                  <Chip startContent={<FaTimes size={18} />} color="danger">
                    3-т-1
                  </Chip>
                </div>
              </AccordionItem>
              <AccordionItem key="4" title="Частковий пошук">
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
              </AccordionItem>
              <AccordionItem key="5" title="Символи">
                <p className="text-gray-600 text-sm mb-2">
                  Для пошуку слід використовувати кириличні літери, цифри та дефіси.
                </p>
              </AccordionItem>
            </Accordion>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SearchInputGuideModal;
