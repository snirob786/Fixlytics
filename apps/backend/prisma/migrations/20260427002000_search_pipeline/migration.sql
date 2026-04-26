-- CreateEnum
CREATE TYPE "SearchPipelineStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP');

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "country" TEXT,
    "platform" TEXT NOT NULL,
    "intent" TEXT,
    "status" "SearchPipelineStatus" NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_fetched_at" TIMESTAMP(3),
    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "domain_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "root_domain" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categories" JSONB,
    "locations" JSONB,
    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "confidence_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialProfile" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Search_hash_key" ON "Search"("hash");
CREATE INDEX "Search_created_at_idx" ON "Search"("created_at");
CREATE INDEX "Search_last_fetched_at_idx" ON "Search"("last_fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "SearchResult_search_id_link_key" ON "SearchResult"("search_id", "link");
CREATE INDEX "SearchResult_search_id_position_idx" ON "SearchResult"("search_id", "position");
CREATE INDEX "SearchResult_domain_id_idx" ON "SearchResult"("domain_id");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "Domain"("domain");
CREATE INDEX "Domain_root_domain_idx" ON "Domain"("root_domain");
CREATE INDEX "Domain_last_seen_at_idx" ON "Domain"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "Business_domain_id_key" ON "Business"("domain_id");
CREATE INDEX "Business_confidence_score_idx" ON "Business"("confidence_score");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_business_id_type_value_key" ON "Contact"("business_id", "type", "value");
CREATE INDEX "Contact_business_id_idx" ON "Contact"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "SocialProfile_business_id_url_key" ON "SocialProfile"("business_id", "url");
CREATE INDEX "SocialProfile_business_id_idx" ON "SocialProfile"("business_id");

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_search_id_fkey"
FOREIGN KEY ("search_id") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_domain_id_fkey"
FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Business" ADD CONSTRAINT "Business_domain_id_fkey"
FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
