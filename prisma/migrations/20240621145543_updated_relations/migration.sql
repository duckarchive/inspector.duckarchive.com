/*
  Warnings:

  - The primary key for the `cases` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `descriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `funds` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `archive_id` to the `cases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fund_id` to the `cases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `archive_id` to the `descriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `archive_id` to the `matches` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_description_id_fkey";

-- DropForeignKey
ALTER TABLE "descriptions" DROP CONSTRAINT "descriptions_fund_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_case_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_description_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_fund_id_fkey";

-- AlterTable
ALTER TABLE "cases" DROP CONSTRAINT "cases_pkey",
ADD COLUMN     "archive_id" VARCHAR(50) NOT NULL,
ADD COLUMN     "fund_id" VARCHAR(50) NOT NULL,
ADD CONSTRAINT "cases_pkey" PRIMARY KEY ("id", "archive_id", "fund_id", "description_id");

-- AlterTable
ALTER TABLE "descriptions" DROP CONSTRAINT "descriptions_pkey",
ADD COLUMN     "archive_id" VARCHAR(50) NOT NULL,
ADD CONSTRAINT "descriptions_pkey" PRIMARY KEY ("id", "archive_id", "fund_id");

-- AlterTable
ALTER TABLE "funds" DROP CONSTRAINT "funds_pkey",
ADD CONSTRAINT "funds_pkey" PRIMARY KEY ("id", "archive_id");

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "archive_id" VARCHAR(50) NOT NULL;

-- AddForeignKey
ALTER TABLE "descriptions" ADD CONSTRAINT "descriptions_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "archives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "descriptions" ADD CONSTRAINT "descriptions_fund_id_archive_id_fkey" FOREIGN KEY ("fund_id", "archive_id") REFERENCES "funds"("id", "archive_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "archives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_fund_id_archive_id_fkey" FOREIGN KEY ("fund_id", "archive_id") REFERENCES "funds"("id", "archive_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_description_id_archive_id_fund_id_fkey" FOREIGN KEY ("description_id", "archive_id", "fund_id") REFERENCES "descriptions"("id", "archive_id", "fund_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "archives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_fund_id_archive_id_fkey" FOREIGN KEY ("fund_id", "archive_id") REFERENCES "funds"("id", "archive_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_description_id_archive_id_fund_id_fkey" FOREIGN KEY ("description_id", "archive_id", "fund_id") REFERENCES "descriptions"("id", "archive_id", "fund_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_case_id_archive_id_fund_id_description_id_fkey" FOREIGN KEY ("case_id", "archive_id", "fund_id", "description_id") REFERENCES "cases"("id", "archive_id", "fund_id", "description_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
