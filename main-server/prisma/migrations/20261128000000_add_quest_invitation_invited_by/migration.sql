-- AlterTable
ALTER TABLE "quest_invitations" ADD COLUMN     "invited_by_id" UUID;

-- AddForeignKey
ALTER TABLE "quest_invitations" ADD CONSTRAINT "quest_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
