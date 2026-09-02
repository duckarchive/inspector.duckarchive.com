import PagePanel from "@/components/page-panel";
import { NextPage } from "next";

// Legal copy is intentionally Ukrainian-only and not routed through next-intl:
// it mirrors the canonical text on duckarchive.com/docs/inspector/terms-and-conditions.
const TermsPage: NextPage = () => {
  return (
    <>
      <PagePanel title="Умови використання Сайту «Качиний Інспектор»" description="Останнє оновлення: 19.12.2024" />
      <article className="flex flex-col gap-4 text-sm max-w-3xl" lang="uk">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">1. Використання Сайту</h2>
          <p>Використовуючи цей сайт, ви:</p>
          <ul className="list-disc list-inside flex flex-col gap-1">
            <li>погоджуєтесь дотримуватись цих Умов використання та всіх застосовних законів і нормативних актів;</li>
            <li>визнаєте суверенітет України в межах 1991 року;</li>
            <li>визнаєте росію країною терористом та окупантом;</li>
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">2. Обмеження відповідальності</h2>
          <p>
            Сайт не несе відповідальності за будь-які збитки, що виникли внаслідок використання або неможливості
            використання матеріалів на цьому сайті.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">3. Зміни до Умов використання</h2>
          <p>
            Ми залишаємо за собою право змінювати ці Умови використання в будь-який час без попереднього повідомлення.
            Використовуючи цей сайт, ви погоджуєтесь з поточною версією цих Умов використання.
          </p>
        </section>
      </article>
    </>
  );
};

export default TermsPage;
