/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { libraryCardFailures, libraryCardOf, libraryCardsOf } from '../eval/library-card.ts';
import { argsMatch, normaliseArgs, outcomeOf, roleOf } from '../eval/normalise.ts';
import { minutesOf, spaceIdsOf, startOf } from '../eval/readers.ts';
import { scoreTurn } from '../eval/score.ts';
import { call, expectOf, FRIEND, names, OTHER_FRIEND, QUEST, turn } from './eval-traces.ts';

// The normalisers of the library and tutorial tools (P06 ticket 06): their arguments, what they answer, and the library
// card of a reply with the `expect.cards` kind `library`. The tools do not exist yet, so these are the spec's shapes. No
// app, no model.

describe('The readers of the library tools', () => {
  it('read a length as whole minutes from a number, digits, H:MM or ISO 8601', () => {
    expect([90, '90', ' 1:30 ', 'PT1H30M', 'PT2H', 'PT45M'].map((given) => minutesOf(given))).toEqual([
      90, 90, 90, 90, 120, 45,
    ]);
    expect(minutesOf('두 시간')).toBe('두 시간');
  });

  it('read a start as HH:MM, from the compact HHMM of a key too', () => {
    expect(
      ['17:00', '17:00:00', '1700', '0930', '2026-11-04T17:00:00+09:00', '2026-11-04T08:00:00Z'].map((given) =>
        startOf(given),
      ),
    ).toEqual(['17:00', '17:00', '17:00', '09:30', '17:00', '17:00']);
  });

  it('read catalogue ids as a sorted set, one id as a set of one', () => {
    expect(spaceIdsOf([' 4F-group-10', '2F-group-10', '4F-group-10'])).toEqual(['2F-group-10', '4F-group-10']);
    expect(spaceIdsOf('7F-7A-zone2')).toEqual(['7F-7A-zone2']);
  });
});

describe('The arguments of the library tools', () => {
  it("read proposeLibraryBooking's space by id, the date, start, minutes and end, and Friends and a Quest by seed", () => {
    const args = {
      spaceId: ' 4F-group-6 ',
      date: '2026-11-05T00:00:00+09:00',
      start: '15:00:00',
      minutes: '120',
      end: '1700',
      equipment: 'with-monitor ',
      useDesc: '과제',
      friendIds: [OTHER_FRIEND, FRIEND],
      questId: QUEST,
    };

    expect(normaliseArgs('proposeLibraryBooking', args, names)).toEqual({
      space: '4F-group-6',
      date: '2026-11-05',
      start: '15:00',
      minutes: 120,
      end: '17:00',
      equipment: 'with-monitor',
      useDesc: '과제',
      friends: ['김민수', '이민수'],
      quest: '농구 파티',
    });
  });

  it('match an expectation written by catalogue id and seed name, in any form of time', () => {
    const actual = normaliseArgs(
      'proposeLibraryBooking',
      { spaceId: '7F-7A-zone2', date: '2026-11-04', start: '17:00', minutes: 120 },
      names,
    );

    expect(
      argsMatch('proposeLibraryBooking', { space: '7F-7A-zone2', start: '1700', minutes: 'PT2H' }, actual, names),
    ).toBe(true);
    expect(argsMatch('proposeLibraryBooking', { minutes: 60 }, actual, names)).toBe(false);
  });
});

describe('The arguments of the other library tools', () => {
  it("read findLibrarySpace's ids as a set and the other tools' fields by their kind", () => {
    expect(
      normaliseArgs(
        'findLibrarySpace',
        { spaceIds: ['8F-8A-zone2-notebook', '7F-notebook-171'], words: ' 노트북존 ' },
        names,
      ),
    ).toEqual({
      spaces: ['7F-notebook-171', '8F-8A-zone2-notebook'],
      words: '노트북존',
    });
    expect(
      normaliseArgs('findLibraryFreeSlots', { spaceId: '7F-7A-zone2', date: '2026-11-04', minutes: '60' }, names),
    ).toEqual({
      space: '7F-7A-zone2',
      date: '2026-11-04',
      minutes: 60,
    });
    expect(normaliseArgs('proposeLibraryCancel', { date: '2026-11-04', start: '1500' }, names)).toEqual({
      date: '2026-11-04',
      start: '15:00',
    });
    expect(normaliseArgs('showLibrarySeats', { spaceId: '7F-7A-zone2' }, names)).toEqual({ space: '7F-7A-zone2' });
    expect(normaliseArgs('getTutorial', { questKey: 'kwanjeong' }, names)).toEqual({ questKey: 'kwanjeong' });
  });

  it('give each tool its role', () => {
    expect(
      ['findLibrarySpace', 'findLibraryFreeSlots', 'proposeLibraryBooking', 'showLibrarySeats', 'getTutorial'].map(
        (tool) => roleOf(tool),
      ),
    ).toEqual(['resolver', 'lookup', 'proposer', 'presenter', 'lookup']);
  });
});

describe('What the library and tutorial tools answer', () => {
  it("is each space's kind, a refusal, a card shown or several", () => {
    const outcomes = ['implemented', 'notOnline', 'unsupported', 'notEligible', 'several', 'refused', 'shown'];

    expect(outcomes.map((result) => outcomeOf(call('findLibrarySpace', {}, { result })))).toEqual(outcomes);
  });

  it("is found for getTutorial's content, which carries no result, and an error for another tool's", () => {
    expect(outcomeOf(call('getTutorial', {}, { state: 'active', quests: [] }))).toBe('found');
    expect(outcomeOf(call('getMenus', {}, { restaurants: [] }))).toBe('error');
  });
});

const bookCard = {
  kind: 'library',
  library: {
    key: 'book:4F-group-6:2026-11-05:1500:120',
    action: 'book',
    space: { id: '4F-group-6', name: '그룹스터디룸 6인실', floor: 4, equipment: 'with-monitor' },
    date: '2026-11-05',
    start: '15:00',
    minutes: 120,
    seat: null,
    useDesc: null,
    useDescOptions: ['강의', '과제'],
    companions: [
      { friendId: OTHER_FRIEND, name: '김민수' },
      { friendId: FRIEND, name: '이민수' },
    ],
  },
};

describe('A library card of the reply', () => {
  it('is read by its fields, Friends by seed name and an unset field as null', () => {
    expect(libraryCardOf(bookCard, names)).toEqual({
      action: 'book',
      space: '4F-group-6',
      date: '2026-11-05',
      start: '15:00',
      minutes: 120,
      seat: null,
      equipment: 'with-monitor',
      useDesc: null,
      companions: ['김민수', '이민수'],
      quest: null,
      target: null,
    });
  });

  it('is read from its key where it lacks a field', () => {
    expect(
      libraryCardOf({ kind: 'library', library: { key: 'book:7F-7A-zone2:2026-11-04:1700:60' } }, names),
    ).toMatchObject({
      action: 'book',
      space: '7F-7A-zone2',
      date: '2026-11-04',
      start: '17:00',
      minutes: 60,
    });
  });

  it('reads a target of a cancel card, and leaves out cards of other kinds', () => {
    const cancel = { kind: 'library', library: { action: 'cancel', target: { date: '2026-11-04', start: '1500' } } };

    expect(libraryCardsOf([{ kind: 'quest', quest: { id: QUEST } }, cancel], names)).toEqual([
      expect.objectContaining({ action: 'cancel', target: { date: '2026-11-04', space: null, start: '15:00' } }),
    ]);
  });
});

// The expectation of one library card, with the key fields written.
function library(written: object): ReturnType<typeof expectOf>['cards'] {
  return expectOf({ actions: ['TOOL'], cards: [{ kind: 'library', ...written }] }).cards;
}

describe('The library card expectation', () => {
  const seen = libraryCardsOf([bookCard], names);

  it('passes a card with the action, space and conditions, written in any form', () => {
    const [wanted] =
      library({
        action: 'book',
        space: '4F-group-6',
        conditions: {
          date: '2026-11-05',
          start: '15:00',
          minutes: 120,
          equipment: 'with-monitor',
          useDesc: null,
          companions: ['이민수', '김민수'],
        },
      }) ?? [];

    expect(wanted === undefined ? ['no expectation'] : libraryCardFailures(wanted, seen)).toEqual([]);
  });

  it('fails a card that differs in a condition, and names it', () => {
    const [wanted] =
      library({ action: 'book', space: '4F-group-6', conditions: { useDesc: '과제', minutes: 60 } }) ?? [];

    expect(wanted === undefined ? [] : libraryCardFailures(wanted, seen)).toEqual([
      '0 library book 4F-group-6 cards, fewer than 1 (closest differs in minutes, useDesc)',
    ]);
  });

  it('counts the matching cards against max, so that max 0 means no such card', () => {
    const [noBook] = library({ action: 'book', max: 0 }) ?? [];
    const [noCancel] = library({ action: 'cancel', max: 0 }) ?? [];

    expect(noBook === undefined ? [] : libraryCardFailures(noBook, seen)).toEqual([
      '1 library book cards, more than 0',
    ]);
    expect(noCancel === undefined ? ['no expectation'] : libraryCardFailures(noCancel, seen)).toEqual([]);
  });

  it('refuses seeds, and key fields on any other kind', () => {
    expect(() => expectOf({ actions: ['TOOL'], cards: [{ kind: 'library', seeds: ['x'] }] })).toThrow();
    expect(() => expectOf({ actions: ['TOOL'], cards: [{ kind: 'quest', action: 'book' }] })).toThrow();
  });
});

describe('A library turn, scored', () => {
  it('passes a book card that matches, as TOOL', () => {
    const proposed = call(
      'proposeLibraryBooking',
      { spaceId: '4F-group-6', date: '2026-11-05', start: '15:00', minutes: 120 },
      { result: 'shown', summary: '' },
    );
    const score = scoreTurn(
      turn({ steps: [[proposed]], text: '예약하기를 눌러야 예약돼요.', cards: [bookCard] }),
      expectOf({
        actions: ['TOOL'],
        tools: { required: ['proposeLibraryBooking'] },
        args: { proposeLibraryBooking: { space: '4F-group-6', start: '1500', minutes: 120 } },
        cards: [{ kind: 'library', action: 'book', space: '4F-group-6', conditions: { date: '2026-11-05' } }],
      }),
      names,
    );

    expect(score).toMatchObject({ action: 'TOOL', passed: true });
  });

  it('reads a refused booking with nothing shown as a REFUSE where the case accepts one', () => {
    const found = call('findLibrarySpace', { spaceIds: ['main-library'] }, { result: 'unsupported' });
    const refusal = expectOf({
      actions: ['REFUSE'],
      tools: { allowed: ['findLibrarySpace'] },
      cards: [{ kind: 'library', max: 0 }],
      text: { mentions: [['미구현']] },
    });

    expect(scoreTurn(turn({ steps: [[found]], text: '본관은 아직 미구현이에요.' }), refusal, names)).toMatchObject({
      action: 'REFUSE',
      passed: true,
    });
  });

  it('still reads a refused booking as an ASK where the case accepts one', () => {
    const refused = call('proposeLibraryBooking', { spaceId: '7F-7A-zone2' }, { result: 'refused' });
    const ask = expectOf({
      actions: ['ASK'],
      tools: { allowed: ['proposeLibraryBooking'] },
      text: { mentions: [['몇 시']] },
    });

    expect(scoreTurn(turn({ steps: [[refused]], text: '몇 시부터 할까요?' }), ask, names)).toMatchObject({
      action: 'ASK',
      passed: true,
    });
  });
});
