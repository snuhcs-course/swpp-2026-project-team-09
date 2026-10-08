-- A Sub Quest's place may be the words the User typed without a point on the map, such as 서울대입구역.
ALTER TABLE "sub_quests" DROP CONSTRAINT "sub_quests_place_check";

-- A Place, or a point with its words, or words alone, or none.
ALTER TABLE "sub_quests" ADD CONSTRAINT "sub_quests_place_check" CHECK (
    ("latitude" IS NULL) = ("longitude" IS NULL)
    AND ("latitude" IS NULL OR "place_label" IS NOT NULL)
    AND ("place_id" IS NULL OR ("latitude" IS NULL AND "place_label" IS NULL))
);
