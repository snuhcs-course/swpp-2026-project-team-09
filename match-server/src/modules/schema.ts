export const schema = `
CREATE TABLE IF NOT EXISTS match_requests (
 id uuid PRIMARY KEY, user_id uuid NOT NULL, status text NOT NULL CHECK(status IN ('searching','finalizing','matched','cancelled','expired')),
 activity text NOT NULL, event_id uuid, time_start timestamptz NOT NULL, time_end timestamptz NOT NULL,
 party_size integer NOT NULL CHECK(party_size BETWEEN 2 AND 6), interests jsonb NOT NULL,
 auto_join_consent boolean NOT NULL CHECK(auto_join_consent), consented_at timestamptz NOT NULL DEFAULT now(),
 embedding jsonb, ai_status text NOT NULL, batch_id uuid, party_id uuid, explanation text,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(time_end>time_start)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_request_per_user ON match_requests(user_id) WHERE status IN ('searching','finalizing');
CREATE INDEX IF NOT EXISTS requests_by_user ON match_requests(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS match_batches (
 id uuid PRIMARY KEY, request_ids uuid[] NOT NULL, user_ids uuid[] NOT NULL, title text NOT NULL,
 event_id uuid, party_size integer NOT NULL, party_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 last_attempt_at timestamptz, last_error text, time_start timestamptz, time_end timestamptz, terminal_at timestamptz
 );
ALTER TABLE match_batches ADD COLUMN IF NOT EXISTS time_start timestamptz;
ALTER TABLE match_batches ADD COLUMN IF NOT EXISTS time_end timestamptz;
ALTER TABLE match_batches ADD COLUMN IF NOT EXISTS terminal_at timestamptz;
UPDATE match_batches b SET time_start=r.time_start,time_end=r.time_end
FROM (SELECT batch_id,max(time_start) AS time_start,min(time_end) AS time_end FROM match_requests WHERE batch_id IS NOT NULL GROUP BY batch_id) r
WHERE b.id=r.batch_id AND (b.time_start IS NULL OR b.time_end IS NULL);
`;
