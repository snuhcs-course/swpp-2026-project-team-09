-- AlterTable
ALTER TABLE "users" ADD COLUMN     "master_off_asked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "friendships" ADD COLUMN     "user_a_off_asked_at" TIMESTAMP(3),
ADD COLUMN     "user_a_plan_asked_at" TIMESTAMP(3),
ADD COLUMN     "user_b_off_asked_at" TIMESTAMP(3),
ADD COLUMN     "user_b_plan_asked_at" TIMESTAMP(3);
