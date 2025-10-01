import prisma from "@/lib/db";

const getTags = async () => {
  console.time("getTags");
  const uniqueTags = await prisma.$queryRaw<Array<{ tag: string }>>`
  SELECT DISTINCT UNNEST("tags") AS tag
  FROM "cases"
  WHERE cardinality("tags") > 0
  ORDER BY tag;
`;
  console.timeEnd("getTags");

  return uniqueTags.map((i) => i.tag) as string[];
};

export default getTags;
