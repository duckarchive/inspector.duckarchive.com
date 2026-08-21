import prisma from "@/lib/db";

const getTags = async () => {
  // Tags live on both files (record types: «метрична книга», …) and authors
  // (confessions: «православ'я», «іудаїзм», …) — the search filter honours both.
  const uniqueTags = await prisma.$queryRaw<Array<{ tag: string }>>`
  SELECT DISTINCT tag FROM (
    SELECT UNNEST("tags") AS tag FROM "files" WHERE cardinality("tags") > 0
    UNION
    SELECT UNNEST("tags") AS tag FROM "authors" WHERE cardinality("tags") > 0
  ) t
  ORDER BY tag;
`;

  return uniqueTags.map((i) => i.tag) as string[];
};

export default getTags;
