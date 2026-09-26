CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, google_sub text NOT NULL UNIQUE, email text NOT NULL UNIQUE,
 display_name text NOT NULL, avatar_url text, location_sharing boolean NOT NULL DEFAULT false
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_epoch integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS events (
 id uuid PRIMARY KEY, title text NOT NULL, description text NOT NULL, starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL CHECK(ends_at>starts_at), location_name text NOT NULL,
 latitude double precision CHECK(latitude BETWEEN -90 AND 90), longitude double precision CHECK(longitude BETWEEN -180 AND 180),
 status text NOT NULL CHECK(status IN ('draft','published','cancelled')), source_url text,
 source text NOT NULL DEFAULT 'manual', external_id text, version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source,external_id)
);
CREATE TABLE IF NOT EXISTS event_revision (id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL DEFAULT 0);
INSERT INTO event_revision(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS parties (
 id uuid PRIMARY KEY,title text NOT NULL,event_id uuid REFERENCES events(id),
 max_members integer NOT NULL CHECK(max_members BETWEEN 2 AND 20),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS party_members (
 party_id uuid REFERENCES parties(id) ON DELETE CASCADE,user_id uuid REFERENCES users(id),
 sharing_enabled boolean NOT NULL DEFAULT true,PRIMARY KEY(party_id,user_id)
);
CREATE TABLE IF NOT EXISTS friendships (
 id uuid PRIMARY KEY,sender_id uuid NOT NULL REFERENCES users(id),receiver_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted')),
 sender_sharing boolean NOT NULL DEFAULT false,receiver_sharing boolean NOT NULL DEFAULT false,
 CHECK(sender_id<>receiver_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS friend_pair ON friendships (least(sender_id,receiver_id),greatest(sender_id,receiver_id));
CREATE TABLE IF NOT EXISTS quests (
 id uuid PRIMARY KEY,party_id uuid NOT NULL REFERENCES parties(id),title text NOT NULL,
 starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),location_name text NOT NULL,
 version integer NOT NULL DEFAULT 1
);
ALTER TABLE quests ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled'));
CREATE TABLE IF NOT EXISTS match_batches (request_id uuid PRIMARY KEY,party_id uuid NOT NULL REFERENCES parties(id),fingerprint text NOT NULL);
CREATE TABLE IF NOT EXISTS consumed_match_requests (request_id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),party_id uuid NOT NULL REFERENCES parties(id));
CREATE TABLE IF NOT EXISTS outbox (
 sequence bigserial PRIMARY KEY,id uuid NOT NULL UNIQUE,envelope jsonb NOT NULL,event_revision bigint,
 delivered_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pending_outbox ON outbox(sequence) WHERE delivered_at IS NULL;

-- Private owner-managed profile and timetable; versions serialize edits per account.
ALTER TABLE users ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_year integer CHECK(admission_year BETWEEN 1900 AND 2100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests jsonb NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_version integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timetable_version integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timetable jsonb NOT NULL DEFAULT '{"timezone":"Asia/Seoul","semesterStartsOn":null,"semesterEndsOn":null,"entries":[]}';
