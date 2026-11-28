/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';

// The router's calls that move the app between screens. Each is one transition the User sees; two in a row show the
// screen between them, such as 내 정보 under 알림, for a moment.
const MOVES = ['navigate', 'push', 'replace', 'back', 'dismiss', 'dismissAll', 'dismissTo'] as const;

// Watches the router's moves from now on, which still go through. Gives a reader of the moves made so far, in order,
// each as its name and its arguments. Restored by `jest.restoreAllMocks`.
export function recordMoves(): () => unknown[][] {
  const spies = MOVES.map((name) => [name, jest.spyOn(router, name)] as const);
  return () =>
    spies
      .flatMap(([name, spy]) =>
        spy.mock.calls.map((args: unknown[], call) => ({
          order: spy.mock.invocationCallOrder[call] ?? 0,
          move: [name, ...args],
        })),
      )
      .toSorted((one, other) => one.order - other.order)
      .map(({ move }) => move);
}
