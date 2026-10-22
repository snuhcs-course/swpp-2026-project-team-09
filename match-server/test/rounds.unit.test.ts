/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The round's split of the waiting requests: withdrawn while the main server answered, standing, no longer standing,
// one User for two Global Events, none. Expected parts from match-server's README (Rounds, step 2) and P09-08.

import { splitRound } from '../src/matching/round.service.js';

const CONCERT = 'global-event-concert';

interface Waiting {
  id: string;
  userId: string;
  globalEventId: string;
}

// A waiting request as the round read it, before it asked the main server which stand.
function waiting(id: string, userId: string, globalEventId = CONCERT): Waiting {
  return { id, userId, globalEventId };
}

describe("A round's split of the waiting requests", () => {
  it.each([
    ['still stands', true],
    ['no longer stands', false],
  ])(
    'a request withdrawn while the main server answered, which it says %s → neither expired nor placed',
    (_, stands) => {
      const withdrawn = waiting('r1', 'u1');
      const other = waiting('r2', 'u2');
      const standing = [other, ...(stands ? [withdrawn] : [])];

      const split = splitRound([withdrawn, other], [other.id], standing);

      expect(split).toEqual({ toExpire: [], toPlace: [other] });
    },
  );

  it('a waiting request that no longer stands → expired', () => {
    const standsNot = waiting('r1', 'u1');
    const stands = waiting('r2', 'u2');

    const split = splitRound([standsNot, stands], [standsNot.id, stands.id], [stands]);

    expect(split).toEqual({ toExpire: [standsNot], toPlace: [stands] });
  });

  it('standing requests → to placement, in the order the round read them', () => {
    const requests = [waiting('r1', 'u1'), waiting('r2', 'u2'), waiting('r3', 'u3')];

    const split = splitRound(requests, ['r1', 'r2', 'r3'], requests.toReversed());

    expect(split).toEqual({ toExpire: [], toPlace: requests });
  });

  it("one User's requests for two Global Events, one standing → told apart", () => {
    const forConcert = waiting('r1', 'u1', CONCERT);
    const forLecture = waiting('r2', 'u1', 'global-event-lecture');

    const split = splitRound([forConcert, forLecture], [forConcert.id, forLecture.id], [forLecture]);

    expect(split).toEqual({ toExpire: [forConcert], toPlace: [forLecture] });
  });

  it('an empty round → nothing expired or placed', () => {
    expect(splitRound([], [], [])).toEqual({ toExpire: [], toPlace: [] });
  });
});
