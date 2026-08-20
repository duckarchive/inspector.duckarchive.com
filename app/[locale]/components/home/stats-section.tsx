import { getLocale, getTranslations } from "next-intl/server";
import { homeStats } from "@/data/home-stats";

const TOTAL_KEYS = ["archives", "fonds", "inventories", "files", "authors", "locations", "onlineCopies"] as const;

const StatsSection: React.FC = async () => {
  const [t, locale] = await Promise.all([getTranslations("home-page.stats"), getLocale()]);
  const format = new Intl.NumberFormat(locale).format;

  return (
    <section className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3 text-center">
        <h2 className="text-headline-lg-mobile md:text-headline-lg tracking-tight">{t("title")}</h2>
        <p className="mx-auto max-w-2xl text-body-lg text-muted text-balance">{t("subtitle")}</p>
      </div>

      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {TOTAL_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-1.5 rounded-xl bg-surface p-6 shadow-surface">
            <dt className="order-2 text-label-sm uppercase tracking-wide text-muted">{t(key)}</dt>
            <dd className="order-1 text-headline-lg-mobile md:text-headline-lg tracking-tight">
              {format(homeStats[key])}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface-secondary p-6">
          <dt className="order-2 text-label-sm uppercase tracking-wide text-muted">{t("checkedLast7Days")}</dt>
          <dd className="order-1 text-headline-md text-accent">{format(homeStats.onlineCopiesCheckedLast7Days)}</dd>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface-secondary p-6">
          <dt className="order-2 text-label-sm uppercase tracking-wide text-muted">
            {t("communityEditsLast7Days")}
          </dt>
          <dd className="order-1 text-headline-md text-accent">
            {format(homeStats.communityEditsAppliedLast7Days)}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default StatsSection;
