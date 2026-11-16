/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions: events' pins that overlap at the zoom or stand apart, or no zoom; an event's own pin, a place's pin of
// events alone and one of several kinds; plain events, and a Favorite Event among the merged. Expected values: the
// spec's rule (P06-02) that a merged pin shows the star of a Favorite Event among them and the total count, with the
// study pins' measure of overlap: closer than 36 points at the zoom.

import { HALL, LIBRARY_POINT } from '../support/map-sources';
import type { CardView } from '@/features/map/adapter';
import { clusteredEvents, eventClusterId, eventMerges, withClusterMarks } from '@/features/map/event-merges';
import type { InterestMark, MarkLook } from '@/features/map/interest-marks';
import { groupedByPlace } from '@/features/map/place-groups';

// 301동 앞, about 80 metres from the hall: one pin's width apart at zoom 15, apart at zoom 17.
const FRONT = { latitude: 37.45091, longitude: 126.95289 };
const CAMPUS_ZOOM = 15;
const CLOSE_ZOOM = 17;

type Mark = Extract<CardView['mark'], { type: 'place' }>;

function eventCard(id: string, position = HALL, marks: Partial<Mark> = {}): CardView {
  return {
    id: `event:${id}`,
    kind: 'global-event',
    mark: { type: 'place', place: 'official', ...marks },
    marker: { name: `공식 행사 · ${id}`, short: id, count: 0, minutesOld: null },
    subLabel: '공식 행사',
    title: id,
    lines: [{ icon: 'pin', text: '301동 대강당' }],
    primary: null,
    secondary: null,
    position,
    event: { id, favorite: marks.starred === true },
  };
}

function partyCard(id: string, position = HALL): CardView {
  return { ...eventCard(id, position), id: `party:${id}`, kind: 'party', mark: { type: 'place', place: 'party' } };
}

function merged(cards: readonly CardView[], zoom: number | null = CAMPUS_ZOOM): readonly CardView[] {
  return clusteredEvents(cards, eventMerges(cards, zoom));
}

describe('eventMerges', () => {
  it("merges events' pins that overlap at the zoom, and none apart or without a zoom", () => {
    const cards = [eventCard('a', HALL), eventCard('b', FRONT), eventCard('far', LIBRARY_POINT)];

    expect(eventMerges(cards, CAMPUS_ZOOM)).toEqual([['event:a', 'event:b']]);
    expect(eventMerges(cards, CLOSE_ZOOM)).toEqual([]);
    expect(eventMerges(cards, null)).toEqual([]);
  });

  it('takes a place of events alone, and leaves a place of several kinds as it is', () => {
    const events = groupedByPlace([eventCard('a', HALL), eventCard('b', HALL), eventCard('c', FRONT)]);
    const mixed = groupedByPlace([eventCard('a', HALL), partyCard('p', HALL), eventCard('c', FRONT)]);

    expect(eventMerges(events, CAMPUS_ZOOM)).toEqual([['place:37.45016,126.95259', 'event:c']]);
    expect(eventMerges(mixed, CAMPUS_ZOOM)).toEqual([]);
  });
});

describe('clusteredEvents', () => {
  it('puts the merged pin where its first would be, with the total count, and keeps each within it', () => {
    const a = eventCard('a', HALL);
    const b = eventCard('b', FRONT);

    const [cluster, ...rest] = merged([a, b]);

    expect(cluster).toMatchObject({
      id: eventClusterId(a),
      kind: 'event-cluster',
      mark: { type: 'place', place: 'official' },
      marker: { name: '공식 행사 2개 묶음 · 눌러서 확대', count: 2 },
      cluster: [HALL, FRONT],
    });
    expect(rest).toEqual([
      { ...a, within: eventClusterId(a) },
      { ...b, within: eventClusterId(a) },
    ]);
  });

  it("counts every event of a place's pin it takes in", () => {
    const cards = groupedByPlace([eventCard('a', HALL), eventCard('b', HALL), eventCard('c', FRONT)]);

    expect(merged(cards)[0]?.marker.count).toBe(3);
  });

  it.each([
    ['plain ones', [{}, {}], {}],
    ['a Favorite Event', [{}, { starred: true }], { starred: true }],
  ])('of %s shows the star only for a Favorite Event', (_, marks, expected) => {
    const cards = marks.map((one, index) => eventCard(`e${index}`, index === 0 ? HALL : FRONT, one));

    expect(merged(cards)[0]?.mark).toEqual({ type: 'place', place: 'official', ...expected });
  });

  it('leaves the cards as they are when nothing overlaps', () => {
    const cards = [eventCard('a', HALL), eventCard('far', LIBRARY_POINT)];

    expect(merged(cards)).toBe(cards);
  });
});

function interestMark(id: string, look: MarkLook): InterestMark {
  return { id, title: id, name: id, look, items: [id], events: [], parties: [] };
}

// Partitions: a merged pin over a member with "!", over faded members only, over a plain and a faded one, and over
// members without a mark. Expected values: the design's one look per mark, "!" first, then plain, then faded.
describe('withClusterMarks', () => {
  const cards = merged([eventCard('a', HALL), eventCard('b', FRONT)]);
  const cluster = eventClusterId(eventCard('a', HALL));

  it.each<[string, MarkLook, MarkLook, MarkLook]>([
    ['a member with "!"', 'plain', 'fresh', 'fresh'],
    ['faded members only', 'faded', 'faded', 'faded'],
    ['a plain and a faded member', 'plain', 'faded', 'plain'],
  ])('gives the merged pin of %s one look', (_, a, b, look) => {
    const marks = new Map([
      ['event:a', interestMark('event:a', a)],
      ['event:b', interestMark('event:b', b)],
    ]);

    const mark = withClusterMarks(cards, marks).get(cluster);

    expect(mark?.look).toBe(look);
    expect(mark?.name).toBe('공식 행사 2개 묶음 · 눌러서 확대');
  });

  it('leaves the marks as they are when no member has one', () => {
    const marks = new Map([['event:far', interestMark('event:far', 'fresh')]]);

    expect(withClusterMarks(cards, marks)).toBe(marks);
  });
});
