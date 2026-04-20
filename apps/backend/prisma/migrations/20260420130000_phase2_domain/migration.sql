-- CreateEnum
CREATE TYPE "SearchSource" AS ENUM ('GOOGLE', 'MAPS', 'DIRECTORY');

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "source" "SearchSource" NOT NULL,
    "cursor_page" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchPageCache" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "page_index" INTEGER NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchPageCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scraped_payload" JSONB NOT NULL,
    "raw_metrics" JSONB NOT NULL,
    "category_scores" JSONB NOT NULL,
    "checks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSearch_user_id_idx" ON "SavedSearch"("user_id");

-- CreateIndex
CREATE INDEX "SearchPageCache_user_id_idx" ON "SearchPageCache"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SearchPageCache_search_id_page_index_key" ON "SearchPageCache"("search_id", "page_index");

-- CreateIndex
CREATE INDEX "Lead_search_id_idx" ON "Lead"("search_id");

-- CreateIndex
CREATE INDEX "Lead_user_id_idx" ON "Lead"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_search_id_url_key" ON "Lead"("search_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_lead_id_key" ON "Analysis"("lead_id");

-- CreateIndex
CREATE INDEX "Analysis_user_id_idx" ON "Analysis"("user_id");

-- CreateIndex
CREATE INDEX "JobRun_user_id_created_at_idx" ON "JobRun"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchPageCache" ADD CONSTRAINT "SearchPageCache_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
