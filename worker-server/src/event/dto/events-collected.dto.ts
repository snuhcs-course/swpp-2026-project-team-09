/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

export const EVENT_LIST_SOURCES = ['snu_events'] as const;

export type EventListSource = (typeof EVENT_LIST_SOURCES)[number];

// One numbered session of a post. A field the rules could not read is null.
export interface CollectedSession {
  number: number;
  // A time with its offset, 2026-10-13T17:00:00+09:00, or a day, 2026-10-13, when no time of day was read.
  start: string | null;
  end: string | null;
  // Where the start and the end were read: the body's time line, or the header's date.
  readFrom: 'body' | 'header' | null;
  // The body's place line, as written.
  place: string | null;
}

// One post of a Source, as its page was read, or as the list shows it when its page is not the post.
export interface CollectedPost {
  // What identifies the post on its Source: the events list's `bbsidx`.
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
  source: EventListSource;
  collectedAt: string;
  // Why the Collection stopped early, or null when it went through the whole list. The main server records it as the
  // failure.
  failureReason: string | null;
  posts: CollectedPost[];
}
