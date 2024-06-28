/*
  Warnings:

  - You are about to drop the `results` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_fetch_id_fkey";

-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_match_id_fkey";

-- DropTable
DROP TABLE "results";

-- DropEnum
DROP TYPE "OperationType";

-- CreateTable
CREATE TABLE "match_results" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "match_id" UUID NOT NULL,
    "count" INTEGER NOT NULL,
    "error" TEXT,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("match_id","created_at")
);

-- CreateTable
CREATE TABLE "fetch_results" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "fetch_id" UUID NOT NULL,
    "count" INTEGER NOT NULL,
    "error" TEXT,

    CONSTRAINT "fetch_results_pkey" PRIMARY KEY ("fetch_id","created_at")
);

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fetch_results" ADD CONSTRAINT "fetch_results_fetch_id_fkey" FOREIGN KEY ("fetch_id") REFERENCES "fetches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
