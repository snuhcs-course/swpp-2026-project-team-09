-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateTable
CREATE TABLE "timetables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "semester_first_day" DATE,
    "semester_last_day" DATE,

    CONSTRAINT "timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timetable_id" UUID NOT NULL,
    "course_name" TEXT NOT NULL,
    "weekdays" "weekday"[],
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "place_id" UUID NOT NULL,
    "room" TEXT,

    CONSTRAINT "timetable_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timetables_user_id_key" ON "timetables"("user_id");

-- CreateIndex
CREATE INDEX "timetable_classes_timetable_id_idx" ON "timetable_classes"("timetable_id");

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_classes" ADD CONSTRAINT "timetable_classes_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_classes" ADD CONSTRAINT "timetable_classes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

