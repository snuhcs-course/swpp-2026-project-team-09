-- AlterEnum
ALTER TYPE "source" ADD VALUE 'extra_snu';

-- CreateEnum
CREATE TYPE "publication_route" AS ENUM ('administrator', 'rule', 'judgement');

-- CreateEnum
CREATE TYPE "session_attachment" AS ENUM ('own', 'rule', 'ai', 'administrator');

-- AlterTable
ALTER TABLE "global_events" ADD COLUMN     "needs_administrator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publication_route" "publication_route";

-- CreateTable
CREATE TABLE "source_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "source" NOT NULL,
    "key" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "step_finished_at" TIMESTAMP(3),

    CONSTRAINT "source_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_post_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_post_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "global_event_id" UUID NOT NULL,
    "attached_by" "session_attachment" NOT NULL,
    "reason" TEXT,
    "read_by_rules" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "source_post_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_posts_source_key_key" ON "source_posts"("source", "key");

-- CreateIndex
CREATE INDEX "source_post_sessions_global_event_id_idx" ON "source_post_sessions"("global_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_post_sessions_source_post_id_number_key" ON "source_post_sessions"("source_post_id", "number");

-- AddForeignKey
ALTER TABLE "source_post_sessions" ADD CONSTRAINT "source_post_sessions_source_post_id_fkey" FOREIGN KEY ("source_post_id") REFERENCES "source_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_post_sessions" ADD CONSTRAINT "source_post_sessions_global_event_id_fkey" FOREIGN KEY ("global_event_id") REFERENCES "global_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every collected event's post becomes a Source Post with one session, discarded events included. The post number is
-- unique and an event without one was not collected, so each collected event gets its own. Nothing the Collections
-- wrote lacks an address; should a row by hand lack one, the post number gives it. Its step is over: the event is as
-- it stands.
WITH moved AS (
    INSERT INTO "source_posts" ("source", "key", "address", "step_finished_at")
    SELECT
        'snu_events'::"source",
        "post_number"::text,
        COALESCE("source_url", 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=' || "post_number"),
        CURRENT_TIMESTAMP
    FROM "global_events"
    WHERE "post_number" IS NOT NULL
    RETURNING "id", "key"
)
INSERT INTO "source_post_sessions" ("source_post_id", "number", "global_event_id", "attached_by", "read_by_rules")
SELECT moved."id", 1, event."id", 'own', event."state" = 'published' AND event."version" = 1
FROM moved
JOIN "global_events" event ON event."post_number"::text = moved."key";

-- A cancelled event was published too, and cancelling raised its version. A discarded event never was.
UPDATE "global_events"
SET "publication_route" = CASE
    WHEN "post_number" IS NOT NULL AND "version" = 1 THEN 'rule'::"publication_route"
    ELSE 'administrator'::"publication_route"
END
WHERE "state" IN ('published', 'cancelled');
