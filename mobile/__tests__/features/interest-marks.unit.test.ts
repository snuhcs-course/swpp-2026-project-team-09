/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type InterestMark, marksOf, sourcesOf } from '@/features/map/interest-marks';
import { EVENTS, HALL_ID, inputs, JOB, matches, RUN } from '../support/interest-marks';
import { NOW } from '../support/map-sources';

// The marks of the watched interests on the everyday map (P05 ticket 13): which items stand on it, how one place
// shares one mark, "!", and the faded events of a User who watches nothing.

function shown(marks: readonly InterestMark[]): [string, string, string][] {
  return marks.map(({ id, title, look }) => [id, title, look]);
}

// Partitions: a match by a watched interest and by a hashtag only; an event and a recruiting party; a party without a
// place on the map. Expected values: the design's "Watching interests", the map shows only what matches.
describe('the marks of the matches', () => {
  it('draws each matching event and recruiting party, whether a watched interest or a hashtag matched, and nothing else', () => {
    const marks = marksOf(inputs(matches([['concert', true]], [['run', false]])));

    expect(shown(marks)).toEqual([
      ['event:concert', '동아리 정기공연', 'plain'],
      ['party:run', '러닝 크루 모집', 'plain'],
    ]);
  });

  it('leaves out a match the map has no place for, such as a party whose step names no Place', () => {
    const nowhere = { ...RUN, nextSubQuest: { ...RUN.nextSubQuest, place: null } };

    expect(marksOf(inputs(matches([], [['run', true]]), { recruiting: [nowhere] }))).toEqual([]);
  });
});

// Partitions: two events at one point, an event and a party at one point, one item alone. Expected values: the
// design's "채용박람회 외 1" and its rule that events or recruiting parties at one place share one mark.
describe('one mark at one place', () => {
  it('names the mark after the first by its start, with 외 and the number of the rest, under the place id', () => {
    const found = matches([
      ['talk', true],
      ['job', false],
    ]);

    expect(marksOf(inputs(found))[0]).toMatchObject({
      id: HALL_ID,
      title: '채용박람회 외 1',
      name: '채용박람회 외 1',
      items: ['event:job', 'event:talk'],
      eventIds: ['job', 'talk'],
      questIds: [],
      firstStart: JOB.startsAt,
    });
  });

  it('puts events before parties, whatever their start', () => {
    const found = matches(
      [
        ['talk', true],
        ['job', true],
      ],
      [['going', true]],
    );

    expect(marksOf(inputs(found))[0]).toMatchObject({
      id: HALL_ID,
      title: '채용박람회 외 2',
      items: ['event:job', 'event:talk', 'party:going'],
      questIds: ['going'],
    });
  });

  it("keeps an item alone at its place under its own card's id", () => {
    expect(marksOf(inputs(matches([['job', true]])))).toMatchObject([{ id: 'event:job', title: '채용박람회' }]);
  });
});

const TOLD_JOB = new Set(['event:job']);

// Partitions: a kept interest-new for a watched match, not opened, opened, opened not yet read; for a hashtag match;
// none kept. Expected values: the ticket's "newly posted" and decisions 2 and 3.
describe('"!" on a mark', () => {
  it.each([
    ['a watched match told and not opened', 'fresh', true, new Set<string>(), TOLD_JOB],
    ['a watched match told and opened', 'plain', true, TOLD_JOB, TOLD_JOB],
    ['a watched match told while the phone has not said what was opened', 'plain', true, null, TOLD_JOB],
    ['a hashtag match told', 'plain', false, new Set<string>(), TOLD_JOB],
    ['a watched match never told', 'plain', true, new Set<string>(), new Set<string>()],
  ] as const)('%s → %s', (_case, look, watched, opened, told) => {
    const [mark] = marksOf(inputs(matches([['job', watched]]), { opened, told }));

    expect(mark?.look).toBe(look);
  });

  it('is on a shared mark when one of its items is newly posted, and its name says so', () => {
    const found = matches([
      ['job', false],
      ['talk', true],
    ]);

    expect(marksOf(inputs(found, { told: new Set(['event:talk']) }))[0]).toMatchObject({
      look: 'fresh',
      name: '채용박람회 외 1 · 새로 올라왔어요',
    });
  });
});

// Partitions: today's events ended, under way later, on another day, more than three; a User who watches something
// with no match. Expected values: the design's "First run", two or three of today's events, faded.
describe('a User who watches nothing', () => {
  it("sees at most three of today's events that have not ended, by their start, faded", () => {
    const marks = marksOf({ ...inputs(matches([])), sources: sourcesOf(matches([]), false, EVENTS, NOW) });

    expect(shown(marks)).toEqual([
      [HALL_ID, '채용박람회 외 1', 'faded'],
      ['event:concert', '동아리 정기공연', 'faded'],
    ]);
  });

  it('a User who watches something and has no match sees no mark', () => {
    expect(marksOf(inputs(matches([])))).toEqual([]);
  });
});
