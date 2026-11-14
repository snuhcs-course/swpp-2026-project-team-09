/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LateSignal } from '@/api/late-types';
import { onLateReport, tellLateReport } from '@/live/late-reports';

let unsubscribe: (() => void) | undefined;

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
});

function listen(): jest.Mock<undefined, [LateSignal]> {
  const listener = jest.fn<undefined, [LateSignal]>();
  unsubscribe = onLateReport(listener);
  return listener;
}

const LATE: LateSignal = { questId: 'q1', userId: 'u1', minutes: 5, arriveAt: '2026-11-17T12:37:00+09:00' };

describe('a Holder’s late report', () => {
  it.each([
    ['an arrival', LATE],
    ['no arrival', { ...LATE, arriveAt: null }],
  ])('reaches a listener with %s', (_, payload) => {
    const listener = listen();

    tellLateReport('late', payload);

    expect(listener).toHaveBeenCalledWith(payload);
  });

  it.each([
    ['no payload', undefined],
    ['no minutes', { questId: 'q1', userId: 'u1', arriveAt: null }],
    ['minutes in words', { ...LATE, minutes: '5' }],
    ['no arrival field', { questId: 'q1', userId: 'u1', minutes: 5 }],
    ['an arrival of a number', { ...LATE, arriveAt: 1237 }],
    ['a number for an id', { ...LATE, userId: 1 }],
  ])('reaches no listener with %s', (_, payload) => {
    const listener = listen();

    tellLateReport('late', payload);

    expect(listener).not.toHaveBeenCalled();
  });

  it('reaches no listener on another signal', () => {
    const listener = listen();

    tellLateReport('quests-changed', LATE);

    expect(listener).not.toHaveBeenCalled();
  });
});
