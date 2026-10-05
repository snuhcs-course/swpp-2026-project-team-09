-- Every User needs a Friend ID, made by the server when it creates the User. No database is deployed yet, so the Users
-- stored before are removed with their sessions instead of being given one.
DELETE FROM "refresh_tokens";
DELETE FROM "sessions";
DELETE FROM "users";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "friend_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "friendships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
    -- The two Users in the order of their ids, so that the unique index below holds one row for any two Users.
    CONSTRAINT "friendships_user_order_check" CHECK ("user_a_id" < "user_b_id"),
    CONSTRAINT "friendships_sender_check" CHECK ("sender_id" IN ("user_a_id", "user_b_id"))
);

-- CreateIndex
CREATE INDEX "friendships_user_b_id_idx" ON "friendships"("user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_user_a_id_user_b_id_key" ON "friendships"("user_a_id", "user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_friend_id_key" ON "users"("friend_id");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
