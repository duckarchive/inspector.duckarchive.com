import PagePanel from "@/components/page-panel";
import { NextPage } from "next";

// Legal copy is intentionally Ukrainian-only and not routed through next-intl:
// it mirrors the canonical text on duckarchive.com/docs/inspector/privacy-policy.
const PrivacyPolicyPage: NextPage = () => {
  return (
    <>
      <PagePanel
        title="Політика приватності проєкту «Качиний Інспектор»"
        description="Останнє оновлення: 02.09.2026"
      />
      <article className="flex flex-col gap-4 text-sm max-w-3xl" lang="uk">
        <p>
          Ця Політика приватності (далі – «Політика») пояснює, як сайт проєкту «Качиний Інспектор» за веб-адресою
          https://inspector.duckarchive.com (далі – «Сайт») збирає, використовує та захищає персональні дані
          користувачів.
        </p>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">1. Дані, що збираються</h2>
          <p>
            Для неавторизованих користувачів Сайт не збирає жодних персональних даних. Щоб користуватися пошуком і
            переглядати каталог, реєструватися не потрібно.
          </p>
          <p>
            Якщо ви входите через обліковий запис Google, Сайт отримує та зберігає лише два поля з вашого профілю
            Google: адресу електронної пошти та ідентифікатор облікового запису (Google ID).
          </p>
          <p>
            Ці дані використовуються виключно для авторизації — щоб упізнати вас між сеансами та надати доступ до
            функцій, доступних лише авторизованим користувачам. Ми не використовуємо їх для реклами та не передаємо
            третім особам.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">2. Зв&apos;язок з нами</h2>
          <p>У разі запитань щодо цієї Політики, ви можете звернутись до розробника.</p>
          <p>
            Ми залишаємо за собою право оновлювати цю Політику всякий раз, коли це необхідно задля змін у діяльності
            Сайту.
          </p>
        </section>
      </article>
    </>
  );
};

export default PrivacyPolicyPage;
