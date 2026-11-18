-- The name and the department are the SNU account's from now on: for an onboarded User, each that the stored Google
-- name gives, under the profile's limits, replaces the User's own. src/users/account-profile.ts reads it the same way
-- at every sign-in.
WITH account AS (
  SELECT
    "id",
    regexp_replace(split_part("google_name", '/', 1), '^\s+|\s+$', '', 'g') AS "name",
    regexp_replace(split_part("google_name", '/', 3), '^\s+|\s+$', '', 'g') AS "department"
  FROM "users"
  WHERE "google_name" <> '' AND "onboarded_at" IS NOT NULL
)
UPDATE "users"
SET
  "name" = CASE WHEN char_length(account."name") BETWEEN 1 AND 30 THEN account."name" ELSE "users"."name" END,
  "department" = CASE
    WHEN char_length(account."department") BETWEEN 1 AND 50 THEN account."department"
    ELSE "users"."department"
  END
FROM account
WHERE "users"."id" = account."id";
