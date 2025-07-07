import DGSArchiveTable from "@/components/dgs-archive-table";
import { NextPage } from "next";
import prisma from "@/lib/db";
import { getDGSListByArchive } from "@/data/dgs-archive-list";
import { ResourceType } from "@/generated/prisma/client";
import { Snippet } from "@heroui/snippet";

export const dynamic = "force-static";
export const revalidate = false;
export const dynamicParams = false;
export const PAGE_SIZE = 50000; // 50k items per page
export const DELIMITER = "___"; // delimiter for archive code and page number

interface DGSArchivePageStaticParams {
  "archive-code": string;
}
export interface DGSArchivePageProps {
  params: Promise<DGSArchivePageStaticParams>;
}

export async function generateStaticParams() {
  const archivesWithCounts = await prisma.$queryRaw<{ code: string; count: bigint }[]>`
    select 
      a.id,
      a.code,
      count(m.id) as count
    from archives a
    left join matches m on m.archive_id = a.id
    left join resources r on m.resource_id = r.id
    where r.type = 'FAMILY_SEARCH'
      and m.case_id is not null
    group by a.id
    having count(m.id) > 0
  `;

  const results: DGSArchivePageStaticParams[] = [];
  archivesWithCounts.forEach(({ code, count }) => {
    const countNum = typeof count === "bigint" ? Number(count) : count;
    const totalPages = Math.ceil(countNum / PAGE_SIZE);
    results.push({ "archive-code": code });
    for (let i = 1; i <= totalPages; i++) {
      results.push({ "archive-code": `${code}${DELIMITER}${i}-${totalPages}` });
    }
  });

  return results;
}

const DGSArchivePage: NextPage<DGSArchivePageProps> = async ({ params }) => {
  const p = await params;
  const archiveCode = decodeURIComponent(p["archive-code"]);

  if (!archiveCode.includes(DELIMITER)) {
    const count = await prisma.match.count({
      where: {
        archive: {
          code: archiveCode.split(DELIMITER)[0],
        },
        resource: {
          type: ResourceType.FAMILY_SEARCH,
        },
        case_id: {
          not: null,
        },
      },
    });
    const total = Math.ceil(count / PAGE_SIZE);
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-bold ">
          Інтегруйте цей код на свій сайт для відображення списку DGS до справ&nbsp;
          {archiveCode}
          {total > 1 ? ` (${total} сторінок)` : ""}
        </h1>
        <p className="">
          Використовується технологія&nbsp;
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            вбудованих фреймів (iframe)
          </a>
          &nbsp;для відображення даних з сайту&nbsp;
          <a
            href="https://inspector.duckarchive.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Качиний Інспектор
          </a>
          . Список розбитий на сторінки по {PAGE_SIZE} записів. Це необхідно для оптимізації завантаження даних та
          зменшення навантаження на сервер.
        </p>
        <div className="">
          <h3 className="text-md font-bold">Як додати цей список на свій сайт (наприклад, WordPress):</h3>
          <ol className="list-decimal list-inside my-2">
            <li>
              Скопіюйте код <b>&lt;iframe&gt;</b> нижче для потрібної сторінки.
            </li>
            <li>Увійдіть в адмін-панель вашого сайту.</li>
            <li>Відкрийте сторінку або запис, куди хочете вставити список.</li>
            <li>Перейдіть у режим редагування HTML (у WordPress це "Блок Коду" або "HTML").</li>
            <li>Вставте скопійований код у потрібне місце.</li>
            <li>Збережіть зміни та перегляньте сторінку.</li>
          </ol>
          <span className="block mt-2">
            Аналогічно можна вставити код у більшість популярних конструкторів сайтів (Wix, Tilda, Joomla тощо) —
            шукайте можливість додати "HTML" або "Власний код".
          </span>
        </div>
        {Array.from({ length: total }, (_, i) => (
          <div key={i}>
            <h4 className="text-md font-semibold mb-2">
              Сторінка {i + 1} з {total}
            </h4>
            <Snippet
              symbol={null}
              className="wrap whitespace-pre-wrap bg-gray-100 p-4 rounded-md"
            >{`<iframe src=https://inspector.duckarchive.com/iframe/family-search-dgs-list/${archiveCode}${DELIMITER}${
              i + 1
            }-${total}" width="100%" height="600" frameborder="0"></iframe>`}</Snippet>
          </div>
        ))}
      </div>
    );
  } else {
    const dgsList = await getDGSListByArchive(archiveCode);
    const updatedAt = new Date().toISOString().split("T")[0];

    return <DGSArchiveTable updatedAt={updatedAt} items={dgsList} />;
  }
};

export default DGSArchivePage;
