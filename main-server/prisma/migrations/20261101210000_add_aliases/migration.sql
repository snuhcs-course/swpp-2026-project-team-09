-- CreateEnum
CREATE TYPE "place_alias_source" AS ENUM ('curated', 'learned');

-- CreateTable
CREATE TABLE "user_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" "resolver_kind" NOT NULL,
    "words" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_aliases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_aliases_words_check" CHECK (char_length("words") BETWEEN 1 AND 50)
);

-- CreateTable
CREATE TABLE "place_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "words" TEXT NOT NULL,
    "place_id" UUID NOT NULL,
    "source" "place_alias_source" NOT NULL,
    "supporters" INTEGER NOT NULL DEFAULT 0,
    "rejecters" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "place_aliases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "place_aliases_words_check" CHECK (char_length("words") BETWEEN 1 AND 50)
);

-- CreateIndex
CREATE INDEX "user_aliases_user_id_kind_words_idx" ON "user_aliases"("user_id", "kind", "words");

-- CreateIndex
CREATE UNIQUE INDEX "user_aliases_user_id_kind_words_target_id_key" ON "user_aliases"("user_id", "kind", "words", "target_id");

-- CreateIndex
CREATE INDEX "place_aliases_words_idx" ON "place_aliases"("words");

-- CreateIndex
CREATE UNIQUE INDEX "place_aliases_words_place_id_key" ON "place_aliases"("words", "place_id");

-- AddForeignKey
ALTER TABLE "user_aliases" ADD CONSTRAINT "user_aliases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_aliases" ADD CONSTRAINT "place_aliases_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
