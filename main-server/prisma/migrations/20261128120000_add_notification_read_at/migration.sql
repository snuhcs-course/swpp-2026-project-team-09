-- Whether the User has read a Notification: unread while null. The rows kept before it whose time has come start read,
-- so that the bell counts only what comes after the Release; one kept for a time still ahead, such as the next
-- morning's 지금 나서요, starts unread and counts when it rings.
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "read_at" TIMESTAMPTZ(3);

UPDATE "notifications" SET "read_at" = now() WHERE "at" <= now();
