-- AlterTable
ALTER TABLE "Job" ADD COLUMN "city" TEXT;

-- Backfill city from location (primary segment before ، or ,)
UPDATE "Job"
SET "city" = NULLIF(
  TRIM(BOTH FROM split_part(replace("location", ',', '،'), '،', 1)),
  ''
)
WHERE "location" IS NOT NULL AND "city" IS NULL;

-- CreateIndex
CREATE INDEX "Job_city_idx" ON "Job"("city");
