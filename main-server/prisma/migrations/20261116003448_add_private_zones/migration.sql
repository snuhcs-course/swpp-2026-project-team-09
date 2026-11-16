-- CreateTable
CREATE TABLE "private_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "outline" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_zones_user_id_idx" ON "private_zones"("user_id");

-- AddForeignKey
ALTER TABLE "private_zones" ADD CONSTRAINT "private_zones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
