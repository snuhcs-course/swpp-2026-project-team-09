/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, Plan } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MENU_LOOKUP_REPLY } from '@/api/mock/data/menu-lookup';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, timeBar as bar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The words under the time card's bar (P04 ticket 82, the user's 나안): the track's start at the left end and its end at
// the right end, always, and between them what bounds the span on the left, after the start time and cut short before
// the end time; what bounds it on the right only when nothing does on the left. Over the stored answer to "배고파,
// 민수랑 같이" (Tuesday 2026-11-17): its first Plan runs from 12:15 to 12:43 in the range 11:30–13:30, 민수 is busy
// until 12:15 ("302동 수업"), 나 until 11:50 and from 13:00 ("24동 수업"); folded, the track runs from 12:00 to 13:15.
// Asked on the Monday before, now is not in the range.

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

const MONDAY = '2026-11-16T11:50:00+09:00';

type Busy = Plan['band']['lanes'][number]['busy'][number];

// The stored reply asked on Monday, keeping only the busy stretches `keep` keeps.
function askedOnMonday(keep: (busy: Busy, plan: Plan) => boolean): AssistantReply {
  const { answer } = MEAL_ANSWER_REPLY;
  const plans = answer.plans.map((plan) => ({
    ...plan,
    band: {
      ...plan.band,
      now: MONDAY,
      lanes: plan.band.lanes.map((lane) => ({ ...lane, busy: lane.busy.filter((busy) => keep(busy, plan)) })),
    },
  }));
  return { ...MEAL_ANSWER_REPLY, answer: { ...answer, plans } };
}

const startsAfter = (busy: Busy, plan: Plan): boolean => new Date(busy.startAt) >= new Date(plan.band.endAt);

function wordsOf(testID: string): string {
  return String(bar().getByTestId(testID).props.children);
}

function ends(): [string, string] {
  return [wordsOf('time-band-start'), wordsOf('time-band-end')];
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: bounded on both sides; on the right alone; on neither; a Lookup's bar.
describe("the time card's bar", () => {
  it('says its start and its end, and between them what bounds the span on the left, cut short on one line', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(ends()).toEqual(['12:00', '13:15']);
    const note = bar().getByTestId('time-band-note');
    expect(note).toHaveTextContent('· 민수 12:15 302동 수업 끝');
    expect(note.props.numberOfLines).toBe(1);
    expect(note).toHaveStyle({ flex: 1, textAlign: 'left' });
    expect(bar().queryByText(/13:00 24동 수업/u)).toBeNull();
  });

  it('says what starts after the span before its end when nothing bounds it on the left', async () => {
    await askOnMap(server, askedOnMonday(startsAfter));

    expect(ends()).toEqual(['11:30', '13:15']);
    const note = bar().getByTestId('time-band-note');
    expect(note).toHaveTextContent('13:00 24동 수업 ·');
    expect(note).toHaveStyle({ textAlign: 'right' });
  });

  it('says only its start and its end when nothing bounds the span', async () => {
    await askOnMap(
      server,
      askedOnMonday(() => false),
    );

    expect(ends()).toEqual(['11:30', '13:30']);
    expect(bar().queryByTestId('time-band-note')).toBeNull();
  });

  it('says its start and its end over a Lookup too', async () => {
    await askOnMap(server, MENU_LOOKUP_REPLY);

    expect(ends()).toEqual(['11:35', '13:15']);
    expect(bar().getByTestId('time-band-note')).toHaveTextContent('· 11:50 일정 끝');
  });
});
