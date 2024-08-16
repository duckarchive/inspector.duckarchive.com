import SearchInputPortable from "../components/search-input-portable";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 mt-8">
      <div className="inline-block max-w-xl justify-center">
        <h1 className="font-normal text-3xl">Шукаєте справу українського архіву онлайн?</h1>
        <p className="mt-4">
          Якщо &quot;так&quot;, тоді ви там де треба. Качиний Інспектор ― це волонтерський
          проект, що постійно оновлюється та розвивається. Щоденно, збираються та
          аналізуються дані з різних онлайн джерел, щоб зробити пошук архівних справ швидким та простим.
        </p>
        <p className="mt-2">
          Щоб розпочати пошук, введіть &quot;шифр&quot; справи в поле нижче та натисніть &quot;Enter&quot;.
        </p>
        <div className="mt-2 w-full">
          <SearchInputPortable isLarge />
        </div>
      </div>
    </section>
  );
}
