/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: before, during and after a step with an end; a step without one before a later start and as the last;
// cancelled and ended steps; a cancelled later step; steps without a start; a Holder's mark of done. Expected values:
// P06 ticket 19's rule, in Korea's time.

import type { SubQuest } from '@/api/types';
import { standingsOf, stepsAhead } from '@/features/quests/plan-steps';

function step(id: string, startsAt: string | null, more: Partial<SubQuest> = {}): SubQuest {
  return {
    id,
    attending: false,
    title: id,
    startsAt,
    endsAt: null,
    place: null,
    completion: 'by_hand',
    cancelled: false,
    done: false,
    ended: false,
    ...more,
  };
}

const MEET = step('모이기', '2026-10-06T09:30:00+09:00');
const TALK = step('설명회', '2026-10-06T10:00:00+09:00', { endsAt: '2026-10-06T12:00:00+09:00' });
const LUNCH = step('점심', '2026-10-06T12:30:00+09:00');
const LATER = step('뒤풀이 장소 정하기', null);
const PLAN = [LATER, LUNCH, TALK, MEET];

function stands(subQuests: readonly SubQuest[], at: string): [string, string][] {
  return standingsOf(subQuests, new Date(at)).map(({ subQuest, stand }) => [subQuest.id, stand]);
}

describe('standingsOf, by time', () => {
  it('before any start → by start, those without one last, the first orange', () => {
    expect(stands(PLAN, '2026-10-06T09:00:00+09:00')).toEqual([
      ['모이기', 'now'],
      ['설명회', 'later'],
      ['점심', 'later'],
      ['뒤풀이 장소 정하기', 'later'],
    ]);
  });

  it('a step without an end stays orange once it started, until a later one starts', () => {
    expect(stands(PLAN, '2026-10-06T09:45:00+09:00')).toEqual([
      ['모이기', 'now'],
      ['설명회', 'later'],
      ['점심', 'later'],
      ['뒤풀이 장소 정하기', 'later'],
    ]);
  });

  it('the next step started → the one before it grey, the started one orange', () => {
    expect(stands(PLAN, '2026-10-06T10:00:00+09:00').slice(0, 2)).toEqual([
      ['모이기', 'past'],
      ['설명회', 'now'],
    ]);
  });

  it('a step whose end passed → grey, though no later step started', () => {
    expect(stands(PLAN, '2026-10-06T12:10:00+09:00').slice(0, 3)).toEqual([
      ['모이기', 'past'],
      ['설명회', 'past'],
      ['점심', 'now'],
    ]);
  });

  it('the last step with a start, without an end → orange long after its start', () => {
    expect(stands([MEET, LUNCH], '2026-10-07T09:00:00+09:00')).toEqual([
      ['모이기', 'past'],
      ['점심', 'now'],
    ]);
  });
});

describe('standingsOf, cancelled, ended and marked steps', () => {
  it.each([
    ['cancelled', { cancelled: true }],
    ['ended by the main server', { ended: true }],
  ])('a step %s → grey', (_, more) => {
    expect(stands([{ ...MEET, ...more }, LUNCH], '2026-10-06T09:00:00+09:00')).toEqual([
      ['모이기', 'past'],
      ['점심', 'now'],
    ]);
  });

  it('a cancelled later step that would have started → greys nothing before it', () => {
    expect(stands([MEET, { ...TALK, cancelled: true }, LUNCH], '2026-10-06T11:00:00+09:00')).toEqual([
      ['모이기', 'now'],
      ['설명회', 'past'],
      ['점심', 'later'],
    ]);
  });

  it('a step marked done by the User → as if not marked', () => {
    expect(stands([{ ...MEET, done: true }, LUNCH], '2026-10-06T09:00:00+09:00')).toEqual([
      ['모이기', 'now'],
      ['점심', 'later'],
    ]);
  });

  it('every step grey → none orange', () => {
    expect(stands([{ ...TALK, ended: true }], '2026-10-06T13:00:00+09:00')).toEqual([['설명회', 'past']]);
  });
});

describe('stepsAhead', () => {
  it('→ the steps not grey, the orange one first', () => {
    expect(stepsAhead(PLAN, new Date('2026-10-06T10:30:00+09:00')).map(({ id }) => id)).toEqual([
      '설명회',
      '점심',
      '뒤풀이 장소 정하기',
    ]);
  });
});
