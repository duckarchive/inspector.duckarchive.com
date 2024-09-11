import { NextPage } from "next";
import Link from "next/link";
import { FaInfoCircle } from "react-icons/fa";
import { siteConfig } from "../../config/site";

const AboutPage: NextPage = async () => {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto pb-6">
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
            Способів використання сервісу (а точніше даних, зібраних в його базі), насправді суттєво більше, ніж простий
            пошук. Інспектор може бути допоміжним інструментом статистики для архівних установ, або ж допомагати
            дослідникам слідкувати за щоденними оновленнями, за допомогою сповіщень, коли цікава їм справа
            з&apos;являється онлайн. Простір для розвитку проєкту досить широкий, але є &quot;але&quot;. Про це далі.
          </p> */}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Як користуватись?</h2>
          <p className="mb-4">
            Для пошуку справи онлайн є два шляхи –{" "}
            <Link href="/search" className="underline">
              пошук
            </Link>{" "}
            та{" "}
            <Link href="/archives" className="underline">
              навігація
            </Link>
            .
          </p>
          <h3 className="text-2xl font-semibold mb-4">Пошук</h3>
          <p className="mb-4">
            <ol className="list-decimal list-inside">
              <li>
                Для початку, відкрийте сторінку{" "}
                <Link href="/search" className="underline">
                  &quot;Пошук&quot;
                </Link>
                .
                <p className="text-gray-600 text-sm my-2 bg-amber-100 p-2 rounded-md">
                  Поле швидкого пошуку, що знаходиться на головній сторінці та в шапці сайту це всього лише спосіб
                  перейти на сторінку &quot;Пошук&quot; з вже заповненими полями відповідно до введеного запиту. Різниці
                  між використанням поля та сторінки немає. Інструкції, щодо формату та використання поля вводу, можна
                  знайти натиснувши на підказку{" "}
                  <FaInfoCircle className="text-lg text-default-400 hover:text-default-800 cursor-pointer flex-shrink-0 inline" />{" "}
                  праворуч від поля.
                </p>
              </li>
              <li>Оберіть код архіву зі списку</li>
              <li>Введіть код фонду, опису та справи</li>
              <li>Натисніть кнопку &quot;Полетіли&quot;</li>
              <li>
                Отримайте результати пошуку з посиланнями на онлайн справи.
                <p className="text-gray-600 text-sm my-2 bg-amber-100 p-2 rounded-md">
                  Кількість результатів обмежена 20 справами, з ціллю зменшення часу на завантаження сторінки та
                  збереження ресурсів, тому намагайтесь конкретизувати свій запит.
                </p>
              </li>
            </ol>
          </p>
          <h3 className="text-2xl font-semibold mb-4">Навігація</h3>
          <p className="mb-4">
            У випадку менш точних дослідженнь, коли ви не знаєте конкретних реквізитів справ, і хочете дізнатися, які
            справи доступні в певному архіві, скористайтесь{" "}
            <Link href="/archives" className="underline">
              навігацією по архівам
            </Link>
            .
          </p>
          {/* <p className="mb-4">Ознайомтесь з відео, або читайте текстову версію нижче</p>
          <iframe
            className="w-full aspect-video"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=TIKmCoB8x92au0sF"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          /> */}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Документація доповнюється...</h2>
          <p>
            В разі виникнення питань, або пропозицій, будь ласка, звертайтеся до автора проєкту в групі телеграм:&nbsp;
            <Link href={siteConfig.links.telegram} className="underline">
              @spravnakachka
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
