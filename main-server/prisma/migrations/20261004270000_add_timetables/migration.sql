-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateTable
CREATE TABLE "timetable_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_name" TEXT NOT NULL,

    CONSTRAINT "timetable_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_times" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "weekday" "weekday" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "place_id" UUID,
    "room" TEXT,

    CONSTRAINT "class_times_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timetable_classes_user_id_idx" ON "timetable_classes"("user_id");

-- CreateIndex
CREATE INDEX "class_times_class_id_idx" ON "class_times"("class_id");

-- AddForeignKey
ALTER TABLE "timetable_classes" ADD CONSTRAINT "timetable_classes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_times" ADD CONSTRAINT "class_times_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "timetable_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_times" ADD CONSTRAINT "class_times_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
