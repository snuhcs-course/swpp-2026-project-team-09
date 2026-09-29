-- CreateTable
CREATE TABLE "administrators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "google_subject" TEXT,
    "tokens_valid_after" TIMESTAMP(3),

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrators_email_key" ON "administrators"("email");

-- CreateIndex
CREATE UNIQUE INDEX "administrators_google_subject_key" ON "administrators"("google_subject");
