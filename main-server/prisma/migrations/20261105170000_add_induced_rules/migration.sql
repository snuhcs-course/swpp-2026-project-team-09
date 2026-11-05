-- AlterEnum
ALTER TYPE "resolution_tier" ADD VALUE 'induced';

-- CreateEnum
CREATE TYPE "induced_rule_kind" AS ENUM ('name', 'words');

-- CreateTable
CREATE TABLE "induced_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "induced_rule_kind" NOT NULL,
    "pattern" TEXT NOT NULL,
    "replace" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "fixed" INTEGER NOT NULL DEFAULT 0,
    "broke" INTEGER NOT NULL DEFAULT 0,
    "accounts" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "induced_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "induced_rules_pattern_check" CHECK (char_length("pattern") BETWEEN 1 AND 80),
    CONSTRAINT "induced_rules_replace_check" CHECK (char_length("replace") BETWEEN 1 AND 40)
);

-- CreateIndex
CREATE UNIQUE INDEX "induced_rules_kind_pattern_replace_key" ON "induced_rules"("kind", "pattern", "replace");
