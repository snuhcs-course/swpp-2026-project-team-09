-- CreateTable
CREATE TABLE "parties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "join_policy" "join_policy" NOT NULL,
    "leader_id" UUID NOT NULL,
    "quest_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "parties_capacity_check" CHECK ("capacity" BETWEEN 1 AND 8)
);

-- CreateTable
CREATE TABLE "party_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp(),
    "sharing" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "party_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parties_quest_id_key" ON "parties"("quest_id");

-- CreateIndex
CREATE INDEX "parties_leader_id_idx" ON "parties"("leader_id");

-- CreateIndex
CREATE UNIQUE INDEX "party_members_user_id_key" ON "party_members"("user_id");

-- CreateIndex
CREATE INDEX "party_members_party_id_idx" ON "party_members"("party_id");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
