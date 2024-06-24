-- AlterTable
ALTER TABLE "results" ADD COLUMN     "fetch_id" UUID;

-- CreateTable
CREATE TABLE "fetches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "resource_id" UUID NOT NULL,
    "api_url" VARCHAR(255) NOT NULL,
    "api_method" VARCHAR(10),
    "api_headers" VARCHAR(255),
    "api_params" VARCHAR(255),
    "archive_id" UUID,
    "fund_id" UUID,
    "description_id" UUID,
    "case_id" UUID,

    CONSTRAINT "fetches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fetches" ADD CONSTRAINT "fetches_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fetches" ADD CONSTRAINT "fetches_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "archives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fetches" ADD CONSTRAINT "fetches_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fetches" ADD CONSTRAINT "fetches_description_id_fkey" FOREIGN KEY ("description_id") REFERENCES "descriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fetches" ADD CONSTRAINT "fetches_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_fetch_id_fkey" FOREIGN KEY ("fetch_id") REFERENCES "fetches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
