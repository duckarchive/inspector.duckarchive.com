/*
  Warnings:

  - The primary key for the `results` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `type` to the `results` table without a default value. This is not possible if the table is not empty.
  - Made the column `fetch_id` on table `results` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('FETCH', 'MATCH');

-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_fetch_id_fkey";

-- AlterTable
ALTER TABLE "results" DROP CONSTRAINT "results_pkey",
ADD COLUMN     "type" "OperationType" NOT NULL,
ALTER COLUMN "fetch_id" SET NOT NULL,
ADD CONSTRAINT "results_pkey" PRIMARY KEY ("fetch_id", "match_id", "created_at");

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_fetch_id_fkey" FOREIGN KEY ("fetch_id") REFERENCES "fetches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
