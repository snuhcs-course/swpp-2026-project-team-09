/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { FIVE_SKIPPED_REPLY, ONE_SKIPPED_REPLY, THREE_PM, TWO_SKIPPED_REPLY } from '@/api/mock/data/skipped-classes';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, timeBar as bar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The asker's Classes left out of a meal's plan in the time card (P04 ticket 93, the design's option 다), against
// the fake main server, over the stored answer to "배고파, 민수랑 같이" with 나's 13:00 24동 Class left out, then the
// afternoon's two, then a day's five: a dashed empty block on the bar where the Class was, also on 나's row under the
// card; under the ends, which stay as they are, a line "뺀 수업" with a pill for each Class; and its ✕, which asks for
// the plan with that Class back, without the model. Partitions: none left out, one, two, five.

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

const PUT_BACK_ONE = '13:00 24동 수업 다시 넣기';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER });
});

afterEach(() => {
  jest.useRealTimers();
});

function rows(): ReturnType<typeof within> {
  return within(screen.getByTestId('time-card-rows', { includeHiddenElements: true }));
}

describe('A Plan with no Class left out', () => {
  it('draws no dashed block and no line', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(bar().queryByTestId('time-band-skipped')).toBeNull();
    expect(bar().queryByTestId('time-band-skipped-line')).toBeNull();
  });
});

describe('A Plan with the 13:00 Class left out', () => {
  it('draws it dashed on the bar and on 나’s row, and says 뺀 수업 under the ends, which stay as they are', async () => {
    await askOnMap(server, ONE_SKIPPED_REPLY);

    expect(bar().getAllByTestId('time-band-skipped')).toHaveLength(1);
    expect(rows().getAllByTestId('time-band-skipped', { includeHiddenElements: true })).toHaveLength(1);
    expect(bar().getByText('뺀 수업')).toBeOnTheScreen();
    expect(bar().getByText('13:00 ✕')).toBeOnTheScreen();
    expect(bar().getByTestId('time-band-start')).toBeOnTheScreen();
    expect(bar().getByTestId('time-band-end')).toBeOnTheScreen();
  });

  it('puts it back with its ✕: the plan asked again with none left out, as a main server before them reads it', async () => {
    const user = await askOnMap(server, ONE_SKIPPED_REPLY);

    await user.press(bar().getByRole('button', { name: PUT_BACK_ONE }));

    const { skipped: _left, ...rest } = ONE_SKIPPED_REPLY.answer.input;
    expect(recalculations(server)).toEqual([expect.objectContaining({ input: rest })]);
    expect(server.received('POST /assistant/messages')).toHaveLength(1);
  });
});

describe('A Plan with the afternoon’s two Classes left out', () => {
  it('has a pill for each, and a ✕ puts back that one alone', async () => {
    const user = await askOnMap(server, TWO_SKIPPED_REPLY);

    expect(bar().getByText('15:00 ✕')).toBeOnTheScreen();
    await user.press(bar().getByRole('button', { name: PUT_BACK_ONE }));

    const asked = expect.objectContaining({ skipped: [THREE_PM.id] }) as unknown;
    expect(recalculations(server)).toEqual([expect.objectContaining({ input: asked })]);
  });
});

describe("A Plan with a day's five Classes left out", () => {
  it('lays the five pills in the one row that scrolls sideways, the label outside it', async () => {
    await askOnMap(server, FIVE_SKIPPED_REPLY);
    const pills = within(bar().getByTestId('time-band-skipped-pills'));

    expect(pills.getAllByRole('button')).toHaveLength(5);
    expect(pills.queryByText('뺀 수업')).toBeNull();
    expect(bar().getByTestId('time-band-skipped-pills').props.horizontal).toBe(true);
    expect(bar().getByText('뺀 수업')).toBeOnTheScreen();
  });
});
