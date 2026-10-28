--------------------------------------------------------------------------------
-- AI-generated with Claude
--
-- 2026-10-29  Fable 5.1  prompted by fyoon46
--------------------------------------------------------------------------------

-- Five accounts for the P07 live run on a fresh migrated and seeded database (230 Places), written straight into the
-- tables as the demo seed does, since nobody signs in as them. Run it from the repository root with the Compose
-- project of the run:
--   docker compose -p p07-live exec -T postgres psql -U main -d main -v ON_ERROR_STOP=1 -f - < this file
-- Access tokens for their sessions come from sign-tokens.mjs beside it. Every name is made up.
--
-- A has B and C as Friends, sharing on at both ends. A and B have a class that ended 10 minutes before this ran and the
-- next 50 minutes after it, so route_to_next_class applies at once, and both a free hour from 11:00 for a rerun between
-- 11:00 and 14:00 in Korea, when lunch_with_free_friend applies. C, D and E have no classes; D and E have no Friends.
-- One published Global Event tomorrow evening lets party_for_open_event apply from the events screen.

BEGIN;

CREATE TEMP TABLE run AS
SELECT
  now() AS at,
  (now() AT TIME ZONE 'Asia/Seoul') AS seoul,
  lower(trim(to_char(now() AT TIME ZONE 'Asia/Seoul', 'day')))::weekday AS weekday;

INSERT INTO users (id, google_subject, email, name, department, admission_year, hashtags, google_name, onboarded_at, friend_id, master_switch_on)
SELECT * FROM (VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid, 'live-a', 'a@live.invalid', '김가람', '컴퓨터공학부', 2023, ARRAY['산책'], '김가람 / 학생', (SELECT at FROM run) - interval '30 days', 'P7A23456', true),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'live-b', 'b@live.invalid', '이나래', '경영학과',     2022, ARRAY['카페'], '이나래 / 학생', (SELECT at FROM run) - interval '30 days', 'P7B23456', true),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'live-c', 'c@live.invalid', '박다온', '수의학과',     2024, ARRAY['사진'], '박다온 / 학생', (SELECT at FROM run) - interval '30 days', 'P7C23456', true),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'live-d', 'd@live.invalid', '최라온', '국어국문학과', 2023, ARRAY['독서'], '최라온 / 학생', (SELECT at FROM run) - interval '30 days', 'P7D23456', false),
  ('55555555-5555-4555-8555-555555555555'::uuid, 'live-e', 'e@live.invalid', '정마루', '물리천문학부', 2021, ARRAY['등산'], '정마루 / 학생', (SELECT at FROM run) - interval '30 days', 'P7E23456', false)
) AS v(id, google_subject, email, name, department, admission_year, hashtags, google_name, onboarded_at, friend_id, master_switch_on);

INSERT INTO sessions (id, user_id) VALUES
  ('11111111-1111-4111-8111-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333'),
  ('44444444-4444-4444-8444-aaaaaaaaaaaa', '44444444-4444-4444-8444-444444444444'),
  ('55555555-5555-4555-8555-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555');

-- user_a_id < user_b_id, as the table checks; A sent both requests.
INSERT INTO friendships (user_a_id, user_b_id, sender_id, accepted_at) VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', (SELECT at FROM run)),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', (SELECT at FROM run));

-- Times of day in Korea as HH:MM, from the moment this ran.
CREATE TEMP TABLE clock AS
SELECT
  to_char((SELECT seoul FROM run) - interval '70 minutes', 'HH24:MI') AS ended_start,
  to_char((SELECT seoul FROM run) - interval '10 minutes', 'HH24:MI') AS ended_end,
  to_char((SELECT seoul FROM run) + interval '50 minutes', 'HH24:MI') AS next_start,
  to_char((SELECT seoul FROM run) + interval '125 minutes', 'HH24:MI') AS next_end;

INSERT INTO timetable_classes (id, user_id, course_name) VALUES
  ('a1111111-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '방금 끝난 수업'),
  ('a1111111-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '다음 수업'),
  ('a1111111-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '오전 수업'),
  ('a1111111-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '오후 수업'),
  ('b2222222-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', '방금 끝난 수업'),
  ('b2222222-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', '다음 수업'),
  ('b2222222-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', '오전 수업'),
  ('b2222222-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', '오후 수업');

INSERT INTO class_times (class_id, weekday, start_time, end_time, place_id, room)
SELECT v.class_id::uuid, (SELECT weekday FROM run), v.start_time, v.end_time, p.id, v.room
FROM (VALUES
  ('a1111111-0000-4000-8000-000000000001', (SELECT ended_start FROM clock), (SELECT ended_end FROM clock), NULL,  NULL),
  ('a1111111-0000-4000-8000-000000000002', (SELECT next_start FROM clock),  (SELECT next_end FROM clock),  '301', '203호'),
  ('a1111111-0000-4000-8000-000000000003', '10:00', '10:50', NULL,  NULL),
  ('a1111111-0000-4000-8000-000000000004', '12:30', '13:45', '302', '105호'),
  ('b2222222-0000-4000-8000-000000000001', (SELECT ended_start FROM clock), (SELECT ended_end FROM clock), NULL,  NULL),
  ('b2222222-0000-4000-8000-000000000002', (SELECT next_start FROM clock),  (SELECT next_end FROM clock),  '302', '301호'),
  ('b2222222-0000-4000-8000-000000000003', '10:00', '10:50', NULL,  NULL),
  ('b2222222-0000-4000-8000-000000000004', '13:00', '14:15', '83',  '201호')
) AS v(class_id, start_time, end_time, place_number, room)
LEFT JOIN places p ON p.number = v.place_number AND p.origin = 'campus_map';

-- A published event tomorrow 18:00 to 20:00 in Korea at 문화관, for party_for_open_event.
INSERT INTO global_events (id, title, description, starts_at, ends_at, place, latitude, longitude, state)
SELECT
  '66666666-6666-4666-8666-666666666666',
  '가을 야외 영화제',
  '문화관 앞 잔디에서 영화를 상영합니다. 담요를 가져오세요.',
  (date_trunc('day', (SELECT seoul FROM run)) + interval '1 day 18 hours') AT TIME ZONE 'Asia/Seoul',
  (date_trunc('day', (SELECT seoul FROM run)) + interval '1 day 20 hours') AT TIME ZONE 'Asia/Seoul',
  p.name, p.latitude, p.longitude, 'published'
FROM places p WHERE p.number = '73' AND p.origin = 'campus_map';

SELECT 'ran at ' || to_char((SELECT seoul FROM run), 'YYYY-MM-DD HH24:MI') || ' Korea, ' || (SELECT weekday FROM run)::text AS note
UNION ALL SELECT 'ended ' || ended_start || '-' || ended_end || ', next ' || next_start || '-' || next_end FROM clock;

COMMIT;
