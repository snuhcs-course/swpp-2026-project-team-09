/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FoundIds } from '../src/assistant/found-ids.js';

// The ids of the Friends a resolver answered among several in one message: no tool takes them until a later answer of
// the resolver names one alone, whatever other tools return of them.

const KIM = 'a0000000-0000-4000-8000-000000000001';
const LEE = 'a0000000-0000-4000-8000-000000000002';

const ASKS = /fit several Friends.*Ask the User which one/su;

function contested(): FoundIds {
  const found = new FoundIds();
  found.contest('friend', [KIM, LEE]);
  return found;
}

describe('A Friend of a resolver’s several', () => {
  it('is taken by no tool, which tells the model to ask the User which one', () => {
    const found = contested();

    expect(found.has('friend', KIM)).toBe(false);
    expect(() => {
      found.refuseUnfound('friend', [KIM]);
    }).toThrow(ASKS);
    expect(found.contested('friend', [KIM, LEE, 'other'])).toEqual([KIM, LEE]);
  });

  it('stays refused when another tool returns the id again', () => {
    const found = contested();

    found.add('friend', [KIM, LEE]);

    expect(found.has('friend', LEE)).toBe(false);
    expect(() => {
      found.refuseUnfound('friend', [LEE]);
    }).toThrow(ASKS);
  });

  it('is taken once a later answer names them alone, and the other stays refused', () => {
    const found = contested();

    found.settle('friend', LEE);

    expect(found.has('friend', LEE)).toBe(true);
    expect(() => {
      found.refuseUnfound('friend', [LEE]);
    }).not.toThrow();
    expect(found.has('friend', KIM)).toBe(false);
    expect(found.contested('friend', [KIM, LEE])).toEqual([KIM]);
  });
});

describe('A Friend of a several and of another answer in the same message', () => {
  it('is refused again by a later several that holds them', () => {
    const found = new FoundIds();
    found.settle('friend', KIM);

    found.contest('friend', [KIM, LEE]);

    expect(found.has('friend', KIM)).toBe(false);
  });

  it('is refused for asking before an id no tool returned', () => {
    const found = contested();

    expect(() => {
      found.refuseUnfound('friend', ['other', KIM]);
    }).toThrow(ASKS);
    expect(() => {
      found.refuseUnfound('friend', ['other']);
    }).toThrow('No tool returned these ids');
  });
});
