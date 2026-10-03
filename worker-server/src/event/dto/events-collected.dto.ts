export const EVENT_LIST_SOURCES = ['snu_events'] as const;

export type EventListSource = (typeof EVENT_LIST_SOURCES)[number];

// One post of the events list, as its page was read. A field the rules could not read is null.
export interface CollectedEvent {
  // The post's `bbsidx`, which identifies it.
  postNumber: number;
  sourceUrl: string;
  title: string;
  // The body as text, one line of the page per line.
  description: string;
  // A time with its offset, 2026-10-13T17:00:00+09:00, or a day, 2026-10-13, when no time of day was read.
  start: string | null;
  end: string | null;
  // Where the start and the end were read: the body's time line, or the header's date.
  readFrom: 'body' | 'header' | null;
  // The body's place line, as written.
  place: string | null;
}

// What a Collection of the events list read, sent to the main server as `events-collected`: posts the main server does
// not store yet.
export interface EventsCollectedMessage {
  source: EventListSource;
  collectedAt: string;
  // False when the Collection stopped at a post it could not read, so that the main server does not record a success.
  complete: boolean;
  events: CollectedEvent[];
}
