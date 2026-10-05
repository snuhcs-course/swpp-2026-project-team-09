-- AlterTable
ALTER TABLE "friendships" ADD COLUMN     "user_a_sharing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "user_b_sharing" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "master_switch_on" BOOLEAN NOT NULL DEFAULT false;
