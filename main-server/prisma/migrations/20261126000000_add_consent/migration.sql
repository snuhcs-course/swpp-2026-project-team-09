-- The consent the User gave on the account: the version of the legal documents, the usage choice, and when each was
-- given. Every existing account starts with none.
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consent_version" INTEGER,
ADD COLUMN     "consented_at" TIMESTAMP(3),
ADD COLUMN     "usage_chosen_at" TIMESTAMP(3),
ADD COLUMN     "usage_consent" BOOLEAN;
