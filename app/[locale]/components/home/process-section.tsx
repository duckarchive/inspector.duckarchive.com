import { getTranslations } from "next-intl/server";
import ProcessDiagram from "./process-diagram";

const STEP_KEYS = ["publish", "index", "search"] as const;

const ProcessSection: React.FC = async () => {
  const t = await getTranslations("home-page.process");

  return (
    <section className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-headline-lg-mobile md:text-headline-lg tracking-tight">{t("title")}</h2>
        <p className="max-w-2xl text-body-lg text-muted text-balance">{t("subtitle")}</p>
      </div>

      <ProcessDiagram duckLabel={t("duckLabel")} />

      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className="flex flex-col gap-2 rounded-xl bg-surface p-6 shadow-surface">
            <span className="text-label-sm uppercase tracking-wide text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="text-headline-md">{t(`steps.${key}.title`)}</h3>
            <p className="text-body-md text-muted">{t(`steps.${key}.description`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default ProcessSection;
