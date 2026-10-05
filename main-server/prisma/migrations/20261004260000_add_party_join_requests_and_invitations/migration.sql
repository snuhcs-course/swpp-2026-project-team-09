-- CreateTable
CREATE TABLE "party_join_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "party_join_requests_user_id_idx" ON "party_join_requests"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "party_join_requests_party_id_user_id_key" ON "party_join_requests"("party_id", "user_id");

-- CreateIndex
CREATE INDEX "party_invitations_user_id_idx" ON "party_invitations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "party_invitations_party_id_user_id_key" ON "party_invitations"("party_id", "user_id");

-- AddForeignKey
ALTER TABLE "party_join_requests" ADD CONSTRAINT "party_join_requests_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_join_requests" ADD CONSTRAINT "party_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_invitations" ADD CONSTRAINT "party_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
