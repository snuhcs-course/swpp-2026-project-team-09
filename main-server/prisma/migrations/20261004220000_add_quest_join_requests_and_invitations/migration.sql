-- CreateTable
CREATE TABLE "quest_join_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quest_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quest_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quest_join_requests_user_id_idx" ON "quest_join_requests"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_join_requests_quest_id_user_id_key" ON "quest_join_requests"("quest_id", "user_id");

-- CreateIndex
CREATE INDEX "quest_invitations_user_id_idx" ON "quest_invitations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_invitations_quest_id_user_id_key" ON "quest_invitations"("quest_id", "user_id");

-- AddForeignKey
ALTER TABLE "quest_join_requests" ADD CONSTRAINT "quest_join_requests_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_join_requests" ADD CONSTRAINT "quest_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_invitations" ADD CONSTRAINT "quest_invitations_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_invitations" ADD CONSTRAINT "quest_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

