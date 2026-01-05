import prisma from "@/lib/db";

const getTags = async () => {
  const uniqueTags = await prisma.$queryRaw<Array<{ tag: string }>>`
  SELECT DISTINCT UNNEST("tags") AS tag
  FROM "cases"
  WHERE cardinality("tags") > 0
  ORDER BY tag;
`;

  return uniqueTags.map((i) => i.tag) as string[];
};

export default getTags;
