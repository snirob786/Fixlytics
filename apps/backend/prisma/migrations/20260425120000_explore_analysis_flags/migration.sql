-- Ephemeral explore flow: persist avgScore + isUnderperforming on Analysis for Prisma filters (no raw SQL).
ALTER TABLE "Analysis" ADD COLUMN "avg_score" DOUBLE PRECISION;
ALTER TABLE "Analysis" ADD COLUMN "is_underperforming" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from existing category_scores JSON (same formula as previous listLeads raw SQL, threshold 50).
UPDATE "Analysis"
SET
  "avg_score" = (
    (
      COALESCE(("category_scores"->>'seo')::double precision, 0) +
      COALESCE(("category_scores"->>'performance')::double precision, 0) +
      COALESCE(("category_scores"->>'design')::double precision, 0)
    ) / 3.0
  )
WHERE "avg_score" IS NULL;

UPDATE "Analysis"
SET "is_underperforming" = ("avg_score" IS NOT NULL AND "avg_score" < 50);
