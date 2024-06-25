-- AlterTable
ALTER TABLE "archives" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "descriptions" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "funds" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0;
