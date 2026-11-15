-- CreateEnum
CREATE TYPE "setting_value_type" AS ENUM ('STRING', 'INTEGER', 'BOOLEAN');

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "value_type" "setting_value_type" NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "old_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "administrator_id" UUID,
    "administrator_email" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setting_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_revision" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "settings_revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_name_key" ON "settings"("name");

-- AddForeignKey
ALTER TABLE "setting_changes" ADD CONSTRAINT "setting_changes_administrator_id_fkey" FOREIGN KEY ("administrator_id") REFERENCES "administrators"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- The one revision row, which every save raises.
ALTER TABLE "settings_revision" ADD CONSTRAINT "settings_revision_one_row" CHECK ("id" = 1);
INSERT INTO "settings_revision" ("id", "revision") VALUES (1, 0);
