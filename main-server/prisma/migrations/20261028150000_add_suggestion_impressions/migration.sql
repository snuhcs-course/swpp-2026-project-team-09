-- CreateEnum
CREATE TYPE "suggestion_outcome" AS ENUM ('shown', 'accepted', 'dismissed', 'confirmed');

-- CreateTable
CREATE TABLE "suggestion_impressions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "template" TEXT NOT NULL,
    "eligible" TEXT[],
    "bucket" TEXT NOT NULL,
    "propensity" DOUBLE PRECISION NOT NULL,
    "holdback" BOOLEAN NOT NULL,
    "shown_at" TIMESTAMP(3) NOT NULL,
    "outcome" "suggestion_outcome" NOT NULL DEFAULT 'shown',
    "outcome_at" TIMESTAMP(3),
    "quest_id" UUID,

    CONSTRAINT "suggestion_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggestion_impressions_user_id_shown_at_idx" ON "suggestion_impressions"("user_id", "shown_at");

-- CreateIndex
CREATE INDEX "suggestion_impressions_bucket_shown_at_idx" ON "suggestion_impressions"("bucket", "shown_at");

-- AddForeignKey
ALTER TABLE "suggestion_impressions" ADD CONSTRAINT "suggestion_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- An outcome other than shown has its time, and only a confirmed one names the Quest it made.
ALTER TABLE "suggestion_impressions" ADD CONSTRAINT "suggestion_impressions_outcome_at_check" CHECK (("outcome" = 'shown') = ("outcome_at" IS NULL)),
ADD CONSTRAINT "suggestion_impressions_quest_id_check" CHECK (("outcome" = 'confirmed') = ("quest_id" IS NOT NULL)),
ADD CONSTRAINT "suggestion_impressions_propensity_check" CHECK ("propensity" > 0 AND "propensity" <= 1);
