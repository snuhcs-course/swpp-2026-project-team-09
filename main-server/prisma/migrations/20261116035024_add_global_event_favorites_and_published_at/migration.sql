-- AlterTable
ALTER TABLE "global_events" ADD COLUMN     "published_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "global_event_favorites" (
    "user_id" UUID NOT NULL,
    "global_event_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_event_favorites_pkey" PRIMARY KEY ("user_id","global_event_id")
);

-- CreateIndex
CREATE INDEX "global_event_favorites_global_event_id_idx" ON "global_event_favorites"("global_event_id");

-- AddForeignKey
ALTER TABLE "global_event_favorites" ADD CONSTRAINT "global_event_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_event_favorites" ADD CONSTRAINT "global_event_favorites_global_event_id_fkey" FOREIGN KEY ("global_event_id") REFERENCES "global_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

