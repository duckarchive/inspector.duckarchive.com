import { Input } from "@nextui-org/input";

import { title } from "@/components/primitives";
import { SearchIcon } from "@/components/icons";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 h-full">
      <div className="inline-block max-w-lg text-center justify-center">
        <h1 className={title()}>
          Щось тут треба буде написати, щоб привітати поважних гостей на
          сайті&nbsp;
        </h1>
        <br />
        <h1 className={title({ color: "violet" })}>Качиного Інспектора</h1>
      </div>

      <div className="mt-8 max-w-lg w-full">
        <Input
          aria-label="Пошук"
          classNames={{
            inputWrapper: "bg-default-100 w-full",
            input: "w-full",
          }}
          label="Знайти справу онлайн"
          labelPlacement="outside"
          placeholder="🛠️ ДАХмО Р6193-2-1 🛠️"
          isDisabled
          size="lg"
          startContent={
            <SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
          }
          type="search"
        />
      </div>
    </section>
  );
}
