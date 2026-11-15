-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "card_kind" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMPTZ(3) NOT NULL,
    "title" TEXT NOT NULL,
    "ahead" TEXT,
    "line" TEXT NOT NULL,
    "body" TEXT,
    "rings" BOOLEAN NOT NULL,
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_at_idx" ON "notifications"("user_id", "at");

-- CreateIndex
CREATE INDEX "notifications_sent_at_at_idx" ON "notifications"("sent_at", "at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_kind_card_kind_card_id_about_key" ON "notifications"("user_id", "kind", "card_kind", "card_id", "about");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

