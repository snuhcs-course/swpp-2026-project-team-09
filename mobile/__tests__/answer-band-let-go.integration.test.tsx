/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import type { TimeBand } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, mapThings, timeBar } from './support/answer-map';
import { layBand, pointsFor, recalculations } from './support/answer-correct';
import { body, dragBody, layTrack, stepBody } from './support/band-move';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, meetFromCard, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// The band dragged whole and let go (P02 ticket 25, "Letting go"), over the fake main server, which answers the meet
// with 민수 and its recalculations with the stored real answer of board a5 (`meet-answer.json`): its first Plan, 302동
// 앞, runs from 12:15 to 12:43, its second, 301동 앞, from 12:18 to 12:45. The time card's track runs over the free time
// around the span, 12:00 to 13:15 (P04 tickets 14 and 61), and is laid 300 wide, four points a minute. Expected values:
// the ticket and its amended criteria. The Plan shown is read from the pick's flag, and another is shown at a press on
// its candidate flag (P04 ticket 04).

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const FIRST_PICK = '302동 앞 · 12:15 만남';
const SECOND = '후보 2 · 301동 앞 · 12:18';
const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';

const MEAL_BAND: TimeBand | undefined = MEAL_ANSWER.plans[0]?.band;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerFriendsWithMinSu(server);
  server.on('POST /assistant/answers', { status: 200, body: MEET_ANSWER });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Asks "만나고 싶다" from 민수's card and lays the band's track out.
async function meetMinSu(): Promise<User> {
  const user = await openMain();
  await layStage(390, 760);
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  await layTrack(300);
  return user;
}

// What the app asks when the band is let go: a5's conditions with the window from `from`, its end left open.
function startingAt(from: string): object {
  return {
    input: { ...MEET_ANSWER.input, window: { from, until: null } },
    location: ON_CAMPUS,
    clientCapabilities: SENT_CAPABILITIES,
  };
}

// Partitions: the band let go at 12:30; a band off the five-minute grid; past the track's end; less than half a step.
describe("a meet's band let go", () => {
  it('asks the meet again from 12:30 and leaves its end to the server', async () => {
    await meetMinSu();

    await dragBody(60);

    expect(recalculations(server)).toHaveLength(2);
    expect(recalculations(server).at(-1)).toEqual(startingAt('12:30'));
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });

  it("moves the second Plan's band, off the grid, by whole steps, and shows the answer's first Plan", async () => {
    const user = await meetMinSu();
    await pressMarker(user, SECOND);

    await dragBody(60);

    expect(recalculations(server).at(-1)).toEqual(startingAt('12:33'));
    expect(mapThings()).toEqual(expect.arrayContaining([FIRST_PICK, SECOND]));
  });

  it("asks from 12:47 for a drag past the track's end", async () => {
    await meetMinSu();

    await dragBody(400);

    expect(recalculations(server).at(-1)).toEqual(startingAt('12:47'));
  });

  it('asks nothing for a drag of less than half a step, and keeps no outline', async () => {
    await meetMinSu();

    await dragBody(2);

    expect(recalculations(server)).toHaveLength(1);
    expect(screen.queryByTestId('time-band-ghost')).toBeNull();
    expect(card().queryByRole('button', { name: '되돌리기' })).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });
});

// Partitions: the answer that came; a recalculation that fails.
describe('after a band let go', () => {
  it('keeps nothing of the Plan shown before: no outline and no 되돌리기 (P04 ticket 86)', async () => {
    const user = await meetMinSu();
    await pressMarker(user, SECOND);
    await dragBody(60);
    await pass(500);

    expect(recalculations(server)).toHaveLength(2);
    expect(screen.queryByTestId('time-band-ghost')).toBeNull();
    expect(card().queryByRole('button', { name: '되돌리기' })).toBeNull();
  });

  it('puts the band and the lines back, and says so, when the recalculation fails', async () => {
    await meetMinSu();
    server.on('POST /assistant/answers', { status: 500, body: { statusCode: 500, message: 'Internal' } });

    await dragBody(120);

    expect(screen.getByText(NOT_RECALCULATED)).toBeVisible();
    expect(body()).toHaveAccessibilityValue({ text: '12:15–12:43' });
    expect(mapThings()).toContain(FIRST_PICK);
    expect(timeBar().getByText('12:15–12:43 · 함께 28분')).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });
});

// Partitions: a screen reader's step each way.
describe("a screen reader's step of the band", () => {
  it.each([
    ['increment', '12:20'],
    ['decrement', '12:10'],
  ] as const)('moves the band by its %s action and asks from %s', async (action, from) => {
    await meetMinSu();

    await stepBody(action);

    expect(recalculations(server).at(-1)).toEqual(startingAt(from));
  });
});

// Partitions: a meal's band, whose folded track is laid 240 wide over the free time around its span (P04 ticket 14).
// What the app asks when the lunch alone's band is let go from `start`.
function aloneFrom(start: string): object {
  return {
    input: { ...MEAL_ANSWER_ALONE.input, window: { from: start, until: null } },
    location: ON_CAMPUS,
    clientCapabilities: SENT_CAPABILITIES,
  };
}

// A lunch alone between two classes stops at the track's end, which keeps one range, open or not (P04 ticket 61): a time
// past the next class is asked in the chat. Expected values: the stored answer's band, 11:50 to 12:45, with the
// User's class at 13:00; the track ends at 13:15 (`foldedRangeOf`), so the latest start is 12:20.
describe("a lunch alone's band let go far", () => {
  const band = MEAL_ANSWER_ALONE.plans[0]?.band;
  const far = pointsFor(130, band);

  it("stops at the folded track's end", async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_FIXED_START });
    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE });
    await layBand();

    await dragBody(far);

    expect(recalculations(server).at(-1)).toEqual(aloneFrom('12:20'));
  });
});

describe("a meal's band let go", () => {
  it('asks the meal again from 12:25 for a drag of ten minutes, and keeps no outline of the place before', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_FIXED_START });
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layBand();

    await dragBody(pointsFor(10, MEAL_BAND));

    expect(recalculations(server)).toEqual([
      {
        input: { ...MEAL_ANSWER.input, window: { from: '12:25', until: null } },
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    expect(mapThings()).toContain('학생회관식당 · 12:40 점심');
    expect(screen.queryByTestId('time-band-ghost')).toBeNull();
  });
});
