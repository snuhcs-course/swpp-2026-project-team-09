/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { scoreTurn } from '../eval/score.ts';
import { call, expectOf, names, turn } from './eval-traces.ts';

// How the scorer reads a library refusal and a case that allows only some tools (P06 ticket 06): a condition refusal
// through proposeLibraryBooking alone, a refused booking in an ASK, and `tools.only`. No app, no model.

describe('A library refusal, scored', () => {
  it('passes a condition refusal that went through proposeLibraryBooking alone, as a REFUSE', () => {
    const refused = call(
      'proposeLibraryBooking',
      { spaceId: '7F-7A-zone2', date: '2026-11-05', start: '09:00', minutes: 180 },
      { result: 'refused', reasons: ['열람실은 당일만 예약할 수 있어요'] },
    );
    const condition = expectOf({
      actions: ['REFUSE'],
      tools: { required: ['proposeLibraryBooking'], only: true },
      cards: [{ kind: 'library', max: 0 }],
      text: { mentions: ['당일'] },
    });
    const looked = call('findLibrarySpace', { spaceIds: ['7F-7A-zone2'] }, { result: 'implemented' });

    expect(
      scoreTurn(turn({ steps: [[refused]], text: '열람실은 당일만 예약할 수 있어요.' }), condition, names),
    ).toMatchObject({
      action: 'REFUSE',
      passed: true,
    });
    expect(
      scoreTurn(turn({ steps: [[looked], [refused]], text: '열람실은 당일만 예약할 수 있어요.' }), condition, names)
        .passed,
    ).toBe(false);
    expect(scoreTurn(turn({ text: '열람실은 당일만 예약할 수 있어요.' }), condition, names).passed).toBe(false);
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

describe('A case that allows only some tools', () => {
  const resolved = call('resolveFriend', { name: '서준' }, { result: 'several' });
  const looked = call('findLibrarySpace', { spaceIds: ['4F-group-6'] }, { result: 'implemented' });
  const sameName = expectOf({
    actions: ['ASK'],
    tools: { allowed: ['resolveFriend'], only: true },
    text: { mentions: ['경영학과'] },
  });

  it('passes a turn that calls only those', () => {
    expect(scoreTurn(turn({ steps: [[resolved]], text: '경영학과 박서준이에요?' }), sameName, names).passed).toBe(true);
  });

  it('fails a turn that calls any other, as a forbidden call', () => {
    const score = scoreTurn(turn({ steps: [[resolved, looked]], text: '경영학과 박서준이에요?' }), sameName, names);

    expect(score.checks.find(({ name }) => name === 'tools.forbidden')).toMatchObject({
      passed: false,
      detail: 'findLibrarySpace called',
    });
  });
});
