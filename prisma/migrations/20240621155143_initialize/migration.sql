-- CreateTable
CREATE TABLE "archives" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "title" VARCHAR(255),
    "info" VARCHAR(255),
    "url" VARCHAR(255),
    "address" VARCHAR(255),
    "phone_number" VARCHAR(20),
    "email" VARCHAR(255),
    "logo_url" VARCHAR(255),

    CONSTRAINT "archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funds" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "title" VARCHAR(255),
    "info" VARCHAR(255),
    "archive_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descriptions" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "title" VARCHAR(255),
    "info" VARCHAR(255),
    "fund_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "title" VARCHAR(255),
    "info" VARCHAR(255),
    "description_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255),
    "info" VARCHAR(255),
    "url" VARCHAR(255),
    "logo_url" VARCHAR(255),

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "url" VARCHAR(255),
    "resource_id" VARCHAR(50) NOT NULL,
    "api_criteria" VARCHAR(255) NOT NULL,
    "api_url" VARCHAR(255) NOT NULL,
    "archive_id" VARCHAR(50),
    "fund_id" VARCHAR(50),
    "description_id" VARCHAR(50),
    "case_id" VARCHAR(50),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "match_id" VARCHAR(50) NOT NULL,
    "count" INTEGER NOT NULL,
    "error" TEXT,

    CONSTRAINT "results_pkey" PRIMARY KEY ("match_id","created_at")
);

-- CreateIndex
CREATE UNIQUE INDEX "funds_code_archive_id_key" ON "funds"("code", "archive_id");

-- CreateIndex
CREATE UNIQUE INDEX "descriptions_code_fund_id_key" ON "descriptions"("code", "fund_id");

-- CreateIndex
CREATE UNIQUE INDEX "cases_code_description_id_key" ON "cases"("code", "description_id");

-- AddForeignKey
ALTER TABLE "funds" ADD CONSTRAINT "funds_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "archives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "descriptions" ADD CONSTRAINT "descriptions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_description_id_fkey" FOREIGN KEY ("description_id") REFERENCES "descriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_archive_id_fkey" FOREIGN KEY ("archive_id") REFERENCES "archives"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_description_id_fkey" FOREIGN KEY ("description_id") REFERENCES "descriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
