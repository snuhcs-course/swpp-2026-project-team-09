/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ConditionChip, MealInput } from '@/api/assistant-types';
import { EASED_ANSWER, NOT_NOW_ANSWER } from '@/api/mock/data/unmet-plans';
import { backToNow, opensBasis, relaxed, timeChipChange } from '@/features/assistant/relaxed-plan';

// What the buttons and chips of a meal that cannot be met do to its conditions (P02-14): over the main server's
// answers of board n11 (nothing fits 지금, 지은 to leave out or 13:00 to take) and n11b (eased to 13:00).

const NOW_INPUT = NOT_NOW_ANSWER.input;
const [ASKER, MINSU, JIEUN] = NOW_INPUT.people;
const JIEUN_ID = JIEUN?.userId ?? '';

const chip = (text: string, kind: ConditionChip['kind'], mark?: ConditionChip['mark']): ConditionChip => ({
  kind,
  text,
  userId: null,
  ...(mark === undefined ? {} : { mark }),
});

// Partitions: each kind of button; a meal eased from 지금, one at 지금, and one without 지금.
describe('a button of board n11', () => {
  it('leaves the Friend out and keeps 지금', () => {
    const input = relaxed(NOW_INPUT, { kind: 'without', userId: JIEUN_ID, label: '지은 빼고 보기' });

    expect(input).toEqual({ ...NOW_INPUT, people: [ASKER, MINSU] });
  });

  it('takes the later start and keeps 지금, which it eases', () => {
    const input = relaxed(NOW_INPUT, { kind: 'from', time: '13:00', label: '13:00 이후' });

    expect(input).toEqual({ ...NOW_INPUT, window: { from: '13:00', until: null, now: true } });
  });
});

describe('going back to 지금', () => {
  it('clears the eased start', () => {
    expect(backToNow(EASED_ANSWER.input)).toEqual({
      ...EASED_ANSWER.input,
      window: { from: null, until: null, now: true },
    });
  });

  it('leaves a start the User fixed without 지금 as it is', () => {
    const fixed: MealInput = { ...NOW_INPUT, window: { from: '13:00', until: null } };

    expect(backToNow(fixed)).toBe(fixed);
  });
});

// Partitions: the relaxed chip of an eased plan; the 지금 chip with a later start to take, and without one; an until chip.
describe('a press on a time chip', () => {
  it('goes back to 지금 from the relaxed chip of board n11b', () => {
    const change = timeChipChange(chip('13:00 이후', 'from', 'relaxed'), EASED_ANSWER);

    expect(change?.(EASED_ANSWER.input)).toEqual(backToNow(EASED_ANSWER.input));
  });

  it('takes the later start from the 지금 chip of board n11', () => {
    const change = timeChipChange(chip('지금', 'from'), NOT_NOW_ANSWER);

    expect(change?.(NOW_INPUT)).toEqual({ ...NOW_INPUT, window: { from: '13:00', until: null, now: true } });
  });

  it('focuses the band when nothing is offered', () => {
    const noPlan = NOT_NOW_ANSWER.noPlan === null ? null : { ...NOT_NOW_ANSWER.noPlan, relax: [] };

    expect(timeChipChange(chip('지금', 'from'), { ...NOT_NOW_ANSWER, noPlan })).toBeNull();
  });

  it('focuses the band from an until chip', () => {
    expect(timeChipChange(chip('14:00 수업까지', 'until'), NOT_NOW_ANSWER)).toBeNull();
    expect(timeChipChange(chip('14:00 수업까지', 'until'), null)).toBeNull();
  });
});

describe('the basis at first', () => {
  const [plan] = EASED_ANSWER.plans;

  it('opens for a Plan with a Friend whose position is unknown (board n23)', () => {
    const parts = plan?.parts.map((part) => (part.me ? part : { ...part, origin: null })) ?? [];

    expect(plan === undefined ? false : opensBasis({ ...plan, parts })).toBe(true);
  });

  it('stays closed when everyone is placed', () => {
    expect(opensBasis(plan)).toBe(false);
    expect(opensBasis(null)).toBe(false);
  });
});
