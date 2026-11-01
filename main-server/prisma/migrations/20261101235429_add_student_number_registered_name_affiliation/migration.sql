-- CreateEnum
CREATE TYPE "affiliation" AS ENUM ('undergraduate', 'graduate', 'exchange');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "affiliation" "affiliation",
ADD COLUMN     "registered_name" TEXT,
ADD COLUMN     "student_number" TEXT;

-- A 학번 is kept as its nine digits, and an empty registered name as none.
ALTER TABLE "users" ADD CONSTRAINT "users_student_number_check" CHECK ("student_number" ~ '^[0-9]{9}$');
ALTER TABLE "users" ADD CONSTRAINT "users_registered_name_check" CHECK ("registered_name" <> '');
