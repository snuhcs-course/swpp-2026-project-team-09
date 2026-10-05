-- CreateTable
CREATE TABLE "invite_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_token_hash_key" ON "invite_links"("token_hash");

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
