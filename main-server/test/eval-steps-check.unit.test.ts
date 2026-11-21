/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { scoreTurn } from '../eval/score.ts';
import { type TurnTrace } from '../eval/trace.ts';
import { expectOf, menusFound, names, turn } from './eval-traces.ts';

// The check of a reply's steps (P03) on hand-made traces. No app, no model.

function failedChecks(trace: TurnTrace, written: unknown): string[] {
  return scoreTurn(trace, expectOf(written), names)
    .checks.filter(({ passed }) => !passed)
    .map(({ name }) => name);
}

type Steps = NonNullable<NonNullable<TurnTrace['reply']>['steps']>;

// A turn whose reply has these steps, or none.
function stepped(steps: Steps | null): TurnTrace {
  const trace = turn({ steps: [[menusFound]], text: '자리 잡고 저녁 먹어요.' });
  return trace.reply === null ? trace : { ...trace, reply: { ...trace.reply, ...(steps === null ? {} : { steps }) } };
}

describe('The steps of a message that asked for several things', () => {
  const kwanjeong = { label: '62-1동' };
  const expected = {
    actions: ['TOOL'],
    steps: [
      { kind: 'seat', status: 'shown' },
      { kind: 'meal', status: 'shown', from: '62-1동' },
    ],
  };

  it('pass when every step is there, in order, from the Place expected', () => {
    const steps = [
      { kind: 'seat', status: 'shown', from: null },
      { kind: 'meal', status: 'shown', from: kwanjeong },
    ];

    expect(failedChecks(stepped(steps), expected)).toEqual([]);
  });

  it('fail on a step out of order, one from another Place, or one missing', () => {
    const reversed = [
      { kind: 'meal', status: 'shown', from: kwanjeong },
      { kind: 'seat', status: 'shown', from: null },
    ];
    const fromClass = [
      { kind: 'seat', status: 'shown', from: null },
      { kind: 'meal', status: 'shown', from: { label: '301동' } },
    ];

    expect(failedChecks(stepped(reversed), expected)).toEqual(['steps']);
    expect(failedChecks(stepped(fromClass), expected)).toEqual(['steps']);
    expect(failedChecks(stepped(null), expected)).toEqual(['steps']);
  });

  it('read an empty list as a reply with no steps', () => {
    expect(failedChecks(stepped(null), { actions: ['TOOL'], steps: [] })).toEqual([]);
    expect(
      failedChecks(stepped([{ kind: 'meal', status: 'shown', from: null }]), { actions: ['TOOL'], steps: [] }),
    ).toEqual(['steps']);
  });
});
