import InventoryTable from "@/components/inventory-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { getInventoryByCode } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/data";
import { getTranslations } from "next-intl/server";

export interface InventoryPageProps {
  params: Promise<{
    "archive-code": string;
    "fond-code": string;
    "inventory-code": string;
  }>;
}

export async function generateMetadata(pageProps: InventoryPageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const fallback = {
    code: "-",
    title: "Опис",
    description: "Деталі опису",
  };
  try {
    const t = await getTranslations("metadata");
    const params = await pageProps.params;
    const { openGraph } = await parent;
    const archiveCode = decodeURIComponent(params["archive-code"]);
    const fondCode = decodeURIComponent(params["fond-code"]);
    const code = decodeURIComponent(params["inventory-code"]);
    const inventory = (await getInventoryByCode(archiveCode, fondCode, code)) || fallback;

    const name = inventory.title ? ` (${inventory.title})` : "";

    return {
      title: `${archiveCode}-${fondCode}-${code}`,
      description: t("description-description", {
        archiveCode,
        fundCode: fondCode,
        descriptionCode: code,
        descriptionTitle: name,
      }),
      openGraph: {
        ...openGraph,
        type: "website",
        url: `/catalog/${archiveCode}/${fondCode}/${code}`,
      },
    };
  } catch (error) {
    console.log("failed to generate metadata for inventory page", error);
    return fallback;
  }
}

const InventoryPage: NextPage = async () => {
  const resources = await getResources();

  return <InventoryTable resources={resources} />;
};

export default InventoryPage;
