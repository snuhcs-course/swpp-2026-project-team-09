/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { crowdedWithFriend } from '@/api/mock/data/crowded-meal';
import { FRIENDS } from '@/api/mock/data/friends';
import type { AnswerLabel } from '@/design-system';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import { droppedId } from '@/features/assistant/quiet-places';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { Room } from '@/screens/main/layout';
import { TAP_WAIT_MS } from '@/screens/main/tutorial/use-map-tap';
import { type AnswerMap, useAnswerMap } from '@/screens/main/use-answer-map';
import { SIZE } from './support/answer-view';
import { type Asked, mapOf } from './support/main-map-stand-in';
import { NO_ANSWER } from './support/no-answer';

// The walking route service is no part of these hooks' units: an answer's walks keep their straight lines.
jest.mock('@/screens/main/use-answer-walks', () => {
  const none = new Map();
  const ways = { paths: none, legs: [] };
  return {
    useAnswerWalks: (lines: readonly unknown[]): readonly unknown[] => lines,
    useWalkPaths: (): ReadonlyMap<string, unknown> => none,
    useMealWays: (): object => ways,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// A press on a place a meal answer cannot do (P04 ticket 70), on the stored crowded answer once a Friend is added:
// 302동식당 alone fits, and the ten others are dropped with their reasons.

const FRIEND = FRIENDS[0]?.id ?? 'f1';

function answerOf(): AnswerReply {
  return crowdedWithFriend('2026-11-27', '2026-11-26T09:00:00+09:00', FRIEND);
}

const ANSWER = answerOf();
const [DROPPED] = ANSWER.dropped;
if (DROPPED === undefined) {
  throw new Error('The stored answer drops no place');
}
const ID = droppedId(DROPPED.place.label);
const WORDS = `${DROPPED.place.label} · ${DROPPED.reason}`;
const ROOM: Room = { stage: SIZE, cardHeight: null, answerHeight: 274, tutorialStart: false, interestsHint: false };
const NOT_INVITED = { sending: false, made: null, standings: NO_STANDINGS, changed: null, changing: false, left: null };

function shownOf(answer: AnswerReply): ShownAnswer {
  return { ...NO_ANSWER, source: answer, answer, plan: answer.plans[0] ?? null, index: 0 };
}

interface Rendered {
  drawn: () => AnswerMap | null;
  showAnswer: (answer: AnswerReply) => Promise<void>;
  asked: Asked;
}

async function rendered(): Promise<Rendered> {
  const asked: Asked = { fits: 0, cameras: [] };
  const map = mapOf(15.26, asked);
  const { result, rerender } = await renderHook(
    ({ shown }: { shown: ShownAnswer }) => useAnswerMap(shown, map, ROOM, { avatars: [], cards: [] }, NOT_INVITED),
    { initialProps: { shown: shownOf(ANSWER) } },
  );
  return {
    drawn: () => result.current,
    showAnswer: async (answer) => {
      await rerender({ shown: shownOf(answer) });
    },
    asked,
  };
}

function markOf(drawn: AnswerMap | null, id: string): { label: AnswerLabel | null; passive: boolean } {
  const marker = drawn?.contents.markers.find((one) => one.id === id);
  const look = marker?.image.view;
  if (marker === undefined || look?.kind !== 'answer') {
    throw new Error(`No mark ${id}`);
  }
  return { label: look.label, passive: marker.passive ?? false };
}

async function press(drawn: AnswerMap | null, id: string): Promise<void> {
  await act(async () => {
    drawn?.onPress(id);
    await Promise.resolve();
  });
}

// A tap of one finger on empty map, as the View around the map sees it, a while after the last press: a tap right
// beside a mark's press is that press's own.
async function tapElsewhere(drawn: AnswerMap | null): Promise<void> {
  const touches = drawn?.touches;
  if (touches === undefined) {
    throw new Error('The answer watches no touches');
  }
  await act(async () => {
    await jest.advanceTimersByTimeAsync(TAP_WAIT_MS + 1);
    touches.onTouchStart({ nativeEvent: { pageX: 100, pageY: 300, timestamp: 1000, touches: [{}] } });
    touches.onTouchEnd({ nativeEvent: { pageX: 100, pageY: 300, timestamp: 1080, touches: [] } });
    await jest.advanceTimersByTimeAsync(TAP_WAIT_MS + 1);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

// Partitions: a press on the quiet dot; then a press on another mark, a tap elsewhere, or another answer. Expected
// values: the answer's `dropped`, as the list shows it.
describe('a press on a place a meal answer cannot do (P04 ticket 70)', () => {
  it('takes the press, and shows its name and the reason the list gives beside its dot', async () => {
    const { drawn } = await rendered();
    expect(markOf(drawn(), ID)).toEqual({ label: null, passive: false });

    await press(drawn(), ID);

    expect(markOf(drawn(), ID).label).toMatchObject({ tone: 'dropped', title: WORDS });
  });

  it('takes the words away at a press on another mark', async () => {
    const { drawn } = await rendered();
    await press(drawn(), ID);

    await press(drawn(), 'answer:pick');

    expect(markOf(drawn(), ID).label).toBeNull();
  });

  it('takes the words away at a tap elsewhere on the map', async () => {
    const { drawn } = await rendered();
    await press(drawn(), ID);

    await tapElsewhere(drawn());

    expect(markOf(drawn(), ID).label).toBeNull();
  });

  it('takes the words away when another answer comes', async () => {
    const { drawn, showAnswer } = await rendered();
    await press(drawn(), ID);

    await showAnswer(answerOf());

    expect(markOf(drawn(), ID).label).toBeNull();
  });

  it('asks the camera to move no more than once, for the answer itself', async () => {
    const { drawn, asked } = await rendered();

    await press(drawn(), ID);
    await press(drawn(), 'answer:pick');

    expect(asked.cameras).toHaveLength(1);
  });
});
