/*
  Warnings:

  - You are about to drop the column `count` on the `archives` table. All the data in the column will be lost.
  - You are about to drop the column `count` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `count` on the `descriptions` table. All the data in the column will be lost.
  - You are about to drop the column `count` on the `funds` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "archives" DROP COLUMN "count";

-- AlterTable
ALTER TABLE "cases" DROP COLUMN "count";

-- AlterTable
ALTER TABLE "descriptions" DROP COLUMN "count";

-- AlterTable
ALTER TABLE "funds" DROP COLUMN "count";
