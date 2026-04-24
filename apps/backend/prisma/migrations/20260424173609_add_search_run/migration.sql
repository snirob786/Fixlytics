-- CreateEnum
CREATE TYPE "SearchRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "status" "SearchRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error" TEXT,
    "job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchRun_search_id_idx" ON "SearchRun"("search_id");

-- CreateIndex
CREATE INDEX "SearchRun_search_id_status_idx" ON "SearchRun"("search_id", "status");

-- AddForeignKey
ALTER TABLE "SearchRun" ADD CONSTRAINT "SearchRun_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
