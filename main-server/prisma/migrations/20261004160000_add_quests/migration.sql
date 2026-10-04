-- CreateTable
CREATE TABLE "quests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "global_event_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_holders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quest_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "global_event_id" UUID,

    CONSTRAINT "quest_holders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_quests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quest_id" UUID NOT NULL,
    "attending" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "place_id" UUID,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "place_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_quests_pkey" PRIMARY KEY ("id"),
    -- The attending Sub Quest reads its title, time and place from the Global Event; any other has a title.
    CONSTRAINT "sub_quests_attending_check" CHECK (
        "attending" = ("title" IS NULL)
        AND NOT ("attending" AND ("starts_at" IS NOT NULL OR "ends_at" IS NOT NULL OR "place_id" IS NOT NULL OR "latitude" IS NOT NULL))
    ),
    CONSTRAINT "sub_quests_time_check" CHECK ("ends_at" > "starts_at"),
    -- A Place, or a point with its label, or neither.
    CONSTRAINT "sub_quests_place_check" CHECK (
        ("latitude" IS NULL) = ("longitude" IS NULL)
        AND ("latitude" IS NULL) = ("place_label" IS NULL)
        AND ("place_id" IS NULL OR "latitude" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "sub_quest_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sub_quest_id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "done_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_quest_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quests_global_event_id_idx" ON "quests"("global_event_id");

-- CreateIndex
CREATE INDEX "quest_holders_global_event_id_idx" ON "quest_holders"("global_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_holders_quest_id_user_id_key" ON "quest_holders"("quest_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_holders_user_id_global_event_id_key" ON "quest_holders"("user_id", "global_event_id");

-- CreateIndex
CREATE INDEX "sub_quests_quest_id_idx" ON "sub_quests"("quest_id");

-- CreateIndex
CREATE UNIQUE INDEX "sub_quests_quest_id_key" ON "sub_quests"("quest_id") WHERE ("attending" = true);

-- CreateIndex
CREATE INDEX "sub_quest_progress_holder_id_idx" ON "sub_quest_progress"("holder_id");

-- CreateIndex
CREATE UNIQUE INDEX "sub_quest_progress_sub_quest_id_holder_id_key" ON "sub_quest_progress"("sub_quest_id", "holder_id");

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_global_event_id_fkey" FOREIGN KEY ("global_event_id") REFERENCES "global_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_holders" ADD CONSTRAINT "quest_holders_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_holders" ADD CONSTRAINT "quest_holders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_holders" ADD CONSTRAINT "quest_holders_global_event_id_fkey" FOREIGN KEY ("global_event_id") REFERENCES "global_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_quests" ADD CONSTRAINT "sub_quests_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_quests" ADD CONSTRAINT "sub_quests_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_quest_progress" ADD CONSTRAINT "sub_quest_progress_sub_quest_id_fkey" FOREIGN KEY ("sub_quest_id") REFERENCES "sub_quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_quest_progress" ADD CONSTRAINT "sub_quest_progress_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "quest_holders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

