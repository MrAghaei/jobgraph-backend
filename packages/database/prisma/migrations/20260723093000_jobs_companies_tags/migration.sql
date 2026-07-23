-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "location" TEXT,
    "salaryRange" TEXT,
    "experienceLevel" TEXT,
    "workType" "WorkType",
    "category" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "datePosted" DATE NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTag" (
    "jobId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTag_pkey" PRIMARY KEY ("jobId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- B-tree indexes (posted_at, company, experience_level, status, filters)
CREATE INDEX "Job_postedAt_idx" ON "Job"("postedAt");

CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

CREATE INDEX "Job_experienceLevel_idx" ON "Job"("experienceLevel");

CREATE INDEX "Job_status_idx" ON "Job"("status");

CREATE INDEX "Job_workType_idx" ON "Job"("workType");

CREATE INDEX "Job_category_idx" ON "Job"("category");

-- Composite unique dedup key: (company, normalized_title, date_posted)
CREATE UNIQUE INDEX "Job_companyId_normalizedTitle_datePosted_key" ON "Job"("companyId", "normalizedTitle", "datePosted");

CREATE INDEX "JobTag_tagId_idx" ON "JobTag"("tagId");

-- GIN full-text index on title + description (simple config for multilingual/Persian listings)
CREATE INDEX "Job_title_description_fts_idx" ON "Job" USING GIN (
  to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))
);

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTag" ADD CONSTRAINT "JobTag_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTag" ADD CONSTRAINT "JobTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
