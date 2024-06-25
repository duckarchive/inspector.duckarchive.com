-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ARCHIUM', 'FAMILY_SEARCH', 'WIKIPEDIA');

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "type" "ResourceType";
