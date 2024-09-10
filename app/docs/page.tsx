import { NextPage } from "next";

const AboutPage: NextPage = async () => {
  return (
    <div className="min-h-screen">
      <header className="py-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold">Качиний Інспектор</h2>
        </div>
      </header>
      <main className="container mx-auto py-6">
        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Мотивація</h3>
          <p className="mb-4">
            Ідея створення проекту виникла як практична потреба у дослідженні власного родоводу. Сучасні темпи
            цифровізації архівів настільки зросли, що щодня публікуються нові справи онлайн. Щоб стежити за оновленнями,
            або вперше розшукати конкретну справу, потрібні навички роботи з пошуковою системою кожного окремого джерела
            + це ще й суттєво забирає час.
          </p>
          <p className="mb-4">
            Так, спочатку збиралася база для особистих потреб, по гілках генеалогічного дерева. Згодом, прийшло
            усвідомлення: &quot;те що здається не потрібним зараз, може знадобитися в майбутньому&quot;. Так розпочалася
            розробка &quot;Качиного Інспектора&quot;.
          </p>
        </section>
        <section className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Про проєкт</h3>
          <p className="mb-4">
            Качиний Інспектор ― це онлайн сервіс для пошуку архівних справ, який допомагає знайти опубліковані справи на
            всіх популярних онлайн джерелах, через єдине вікно пошуку.
          </p>

          <details className="mb-4 cursor-pointer">
            <summary>Список онлайн джерел</summary>
            <ul className="list-disc list-inside pl-6 mb-4">
              <li>Family Search</li>
              <li>Wiki</li>
              <li>Archium</li>
              <li>babynyar.org</li>
              <li>Вікіджерела</li>
              <li>сайти архівів</li>
              <li>та інші</li>
            </ul>
          </details>

          <p className="mb-4">
            Непомітно для користувача, сервіс регулярно перевіряє наявність нових справ на вищезазначених джерелах і
            оновлює базу даних. Таким чином, всі знайдені справи можна переглянути в одному місці, без необхідності
            переходити на кожний сайт окремо, та витрачати час на пошук. Це основна, але не єдина задача проєкту.
          </p>

          {/* <p className="mb-4">
            Способів використання подібного сервісу (а точніше даних, зібраних в його базі), насправді суттєво більше,
            ніж просто пошук. Інспектор може бути допоміжним інструментом статистики для архівних установ, або
            надсилати сповіщення дослідникам, коли цікава їм справа з&apos;являється онлайн. Простір для розвитку
            проєкту досить широкий, але є &quot;але&quot;. Про це далі.
          </p> */}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Як користуватись?</h2>
          <p className="mb-4">Ознайомтесь з відео, або читайте текстову версію нижче</p>
          <iframe
            className="w-full aspect-video"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=TIKmCoB8x92au0sF"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
