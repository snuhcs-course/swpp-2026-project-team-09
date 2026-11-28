/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { MapCamera } from '@/map';
import { FIRST, type Given, render, ROOM, shownAt } from './support/answer-map-hook';
import type { Asked } from './support/main-map-stand-in';

// When an answer's camera frames its drawing (P10 ticket 30, the user's phone, 2026-11-28): once for each event that
// asks for it, a new reply, a press that opens or chooses something, or a recalculation that brings other places; the
// framing follows its own card's layout until the map rests after its glide, and the camera is the User's from then on.

// The walking route service is no part of these hooks' units: an answer's walks keep their straight lines.
jest.mock('@/screens/main/use-answer-walks', () => {
  const none = new Map();
  return {
    useAnswerWalks: (lines: readonly unknown[]): readonly unknown[] => lines,
    useWalkPaths: (): ReadonlyMap<string, unknown> => none,
    useMealWays: (): object => ({ paths: none, legs: [] }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

async function wait(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

// The card laid out taller over the first Plan.
const TALLER: Given = { ...FIRST, room: { ...ROOM, answerHeight: 380 } };

// A recalculation's answer: a new object, as every answer of the server is, here with the stored answer's Plans.
function recalculated(plans = MEAL_ANSWER.plans): ShownAnswer {
  const answer = { ...MEAL_ANSWER, plans };
  return { ...shownAt(0), answer, plan: answer.plans[0] ?? null };
}

function onFakeTimers(): void {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
}

// The same answer and card, with the map resting where the glide brought it.
function rested(given: Given, asked: Asked): Given {
  return { ...given, camera: asked.cameras.at(-1) ?? null };
}

// The camera an answer gets when it comes first under a card of 274.
async function firstCamera(shown: ShownAnswer): Promise<MapCamera | undefined> {
  const fresh: Asked = { fits: 0, cameras: [] };
  await render(fresh, { ...FIRST, shown });
  return fresh.cameras[0];
}

// Partitions: once the framing has rested, a recalculation that keeps the Plan's place, and one that brings another
// place first, each with the card laid out again 60 ms after it. Expected values: P10 ticket
// 30's rule: no move for the same places, and for another place one move, once the drawing and the card have stayed
// the same for 120 ms, to the camera that answer gets when it comes first.
describe("the answer's camera after a recalculation", () => {
  onFakeTimers();

  it('moves nothing for the same places, the card laid out again', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked, TALLER);
    const at = rested(TALLER, asked);
    await rerender(at);
    const shown = recalculated();

    await rerender({ ...at, shown });
    await wait(60);
    await rerender({ ...at, shown, room: ROOM });
    await wait(1000);

    expect(asked.cameras).toHaveLength(1);
  });

  it('moves once for another place, after the drawing and the card have stayed the same for 120 ms', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked, TALLER);
    const at = rested(TALLER, asked);
    await rerender(at);
    const [first, second, third, ...rest] = MEAL_ANSWER.plans;
    const shown = recalculated([third, first, second, ...rest].filter((plan) => plan !== undefined));

    await rerender({ ...at, shown });
    await wait(60);
    await rerender({ ...at, shown, room: ROOM });
    await wait(119);
    expect(asked.cameras).toHaveLength(1);
    await wait(1);

    expect(asked.cameras).toHaveLength(2);
    expect(asked.cameras[1]).toEqual(await firstCamera(shown));
    await wait(1000);
    expect(asked.cameras).toHaveLength(2);
  });
});

// Partitions: a recalculation's answer without a Plan. Expected values: no move, and no fit.
describe("the answer's camera after a recalculation without a Plan", () => {
  onFakeTimers();

  it('stays where it is', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked, TALLER);

    // The recalculated answer with its Plans emptied for the boundary.
    await rerender({ ...FIRST, shown: recalculated([]) });
    await wait(1000);

    expect(asked.cameras).toHaveLength(1);
    expect(asked.fits).toBe(0);
  });
});

// Partitions: a change of the card before the map rests after the glide, and after. Expected values: P10 ticket 30's
// rule: the framing follows its own layout until the camera rests, and the camera is the User's from then on.
describe("the answer's camera and a change of the card", () => {
  it('frames again before the map has rested after the glide', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked, TALLER);

    await rerender(FIRST);

    expect(asked.cameras).toHaveLength(2);
  });

  it('moves nothing once the map has rested after the glide', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked, TALLER);
    const at = rested(TALLER, asked);
    await rerender(at);

    await rerender({ ...at, room: ROOM });
    await rerender({ ...at, room: { ...ROOM, answerHeight: 336 } });

    expect(asked.cameras).toHaveLength(1);
  });
});
