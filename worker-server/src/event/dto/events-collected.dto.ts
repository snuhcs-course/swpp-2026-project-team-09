/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

export const EVENT_LIST_SOURCES = ['snu_events'] as const;

export type EventListSource = (typeof EVENT_LIST_SOURCES)[number];

export const EXTRA_SNU_SOURCES = ['extra_snu'] as const;

export type ExtraSnuSource = (typeof EXTRA_SNU_SOURCES)[number];

// The Sources whose posts become Global Events.
export type PostSource = EventListSource | ExtraSnuSource;

// One numbered session of a post. A field the rules could not read is null.
export interface CollectedSession {
  number: number;
  // The session's own title, when the post's title alone would not tell it from the post's other sessions.
  title?: string;
  // A time with its offset, 2026-10-13T17:00:00+09:00, or a day, 2026-10-13, when no time of day was read.
  start: string | null;
  end: string | null;
  // Where the start and the end were read: `body` for the post's own statement of the event's time, its body's time line
  // or extra.snu's session field, `header` for the header's date. The main server's rules publish only from `body`, so a
  // time that is known but that they should not publish is sent with null.
  readFrom: 'body' | 'header' | null;
  // The body's place line or the session's place field, as written.
  place: string | null;
}

// One post of a Source, as its page was read, or as the list shows it when its page is not the post.
export interface CollectedPost {
  // What identifies the post on its Source: the events list's `bbsidx`, extra.snu's `dataSeq`.
  key: string;
  address: string;
  title: string;
  // The body as text, one line of the page per line; empty when the page was not the post.
  description: string;
  sessions: CollectedSession[];
}

// What a Collection of a Source's posts read, posted to the main server's `/global-events/collected`: posts the main
// server does not store yet.
export interface EventsCollectedMessage {
  source: PostSource;
  collectedAt: string;
  // Why the Collection stopped early, or null when it went through the whole list. The main server records it as the
  // failure.
  failureReason: string | null;
  // The posts the Collection could not read without a sign-in, on a Source that has such posts. It is not a failure.
  skippedPosts?: number;
  posts: CollectedPost[];
}
