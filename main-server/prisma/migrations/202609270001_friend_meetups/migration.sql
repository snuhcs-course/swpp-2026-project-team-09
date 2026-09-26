ALTER TABLE parties ADD COLUMN visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public','private'));

CREATE TABLE meetups (
  id uuid PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  location_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  party_id uuid UNIQUE REFERENCES parties(id),
  quest_id uuid UNIQUE REFERENCES quests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id),
  CHECK ((status = 'accepted' AND party_id IS NOT NULL AND quest_id IS NOT NULL)
    OR (status <> 'accepted' AND party_id IS NULL AND quest_id IS NULL))
);
CREATE INDEX meetups_sender_id_created_at_idx ON meetups(sender_id, created_at);
CREATE INDEX meetups_recipient_id_created_at_idx ON meetups(recipient_id, created_at);
