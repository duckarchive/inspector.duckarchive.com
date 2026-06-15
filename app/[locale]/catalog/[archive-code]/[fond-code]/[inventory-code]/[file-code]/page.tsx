import FileTable from "@/components/file-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { getFileByCode } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/[file-code]/data";
import { getTranslations } from "next-intl/server";

export interface FilePageProps {
  params: Promise<{
    "archive-code": string;
    "fond-code": string;
    "inventory-code": string;
    "file-code": string;
  }>;
}

export async function generateMetadata(pageProps: FilePageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const fallback = {
    code: "-",
    title: "Справа",
    description: "Деталі справи",
  };
  try {
    const t = await getTranslations("metadata");
    const params = await pageProps.params;
    const { openGraph } = await parent;
    const archiveCode = decodeURIComponent(params["archive-code"]);
    const fondCode = decodeURIComponent(params["fond-code"]);
    const inventoryCode = decodeURIComponent(params["inventory-code"]);
    const code = decodeURIComponent(params["file-code"]);
    const file = await getFileByCode(archiveCode, fondCode, inventoryCode, code) || fallback;

    const name = file.title ? ` (${file.title})` : "";

    return {
      title: `${archiveCode}-${fondCode}-${inventoryCode}-${code}`,
      description: t("case-description", {
        archiveCode,
        fundCode: fondCode,
        descriptionCode: inventoryCode,
        caseCode: code,
        caseTitle: name,
      }),
      openGraph: {
        ...openGraph,
        type: "website",
        url: `/catalog/${archiveCode}/${fondCode}/${inventoryCode}/${code}`,
      },
    };
  } catch (error) {
    console.log("failed to generate metadata for file page", error);
    return fallback;
  }
}

const FilePage: NextPage = async () => {
  const resources = await getResources();

  return <FileTable resources={resources} />;
};

export default FilePage;
