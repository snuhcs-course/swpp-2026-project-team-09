/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import type { AnswerReply, TimeBand } from '@/api/assistant-types';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { recalculations } from './support/answer-correct';
import { dragBody, layTrack } from './support/band-move';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, meetFromCard, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A band past midnight let go (P01 ticket 49), over the fake main server, which answers the meet with 민수 with a5's
// stored answer, its first Plan moved to the night of its date, 2026-11-17: the track runs over 23:00 to 01:30 of the
// next day, with nobody busy, laid 300 wide, two points a minute. A time let go past midnight is sent as hours past 24,
// counted from the input's date (P05 ticket 91), so the main server reads it on the next day. Partitions: the end let go
// at 00:30; the band moved whole past midnight; a band wholly after midnight; every word the User reads.

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

const at = (clock: string, date = '2026-11-17'): string => `${date}T${clock}:00+09:00`;
const next = (clock: string): string => at(clock, '2026-11-18');

// a5's answer with its first Plan's band from `start` to `end`, in a range of 23:00 to 01:30, nobody busy.
function lateAnswer(start: string, end: string, text: string): AnswerReply {
  const [first, ...rest] = MEET_ANSWER.plans;
  if (first === undefined) {
    throw new Error('The stored meet answer has no Plan');
  }
  const band: TimeBand = {
    ...first.band,
    range: { startAt: at('23:00'), endAt: next('01:30') },
    now: at('22:50'),
    lanes: first.band.lanes.map((lane) => ({ ...lane, busy: [] })),
    startAt: start,
    endAt: end,
    text,
  };
  return { ...MEET_ANSWER, plans: [{ ...first, startAt: start, endAt: end, band }, ...rest] };
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerFriendsWithMinSu(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function meetMinSu(answer: AnswerReply): Promise<void> {
  server.on('POST /assistant/answers', { status: 200, body: answer });
  const user = await openMain();
  await layStage(390, 760);
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  await layTrack(300);
}

async function dragHandle(bound: 'from' | 'until', dx: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(`time-band-${bound}`), [
      { translationX: 0, translationY: 0 },
      { translationX: dx, translationY: 0 },
    ]);
  });
  await pass(500);
}

// The window of the last recalculation asked.
function askedWindow(): unknown {
  const body: unknown = recalculations(server).at(-1);
  if (typeof body !== 'object' || body === null || !('input' in body)) {
    return null;
  }
  const { input } = body;
  return typeof input === 'object' && input !== null && 'window' in input ? input.window : null;
}

describe('a band across midnight let go', () => {
  it('asks its end at 00:30 of the next day as "24:30"', async () => {
    await meetMinSu(lateAnswer(at('23:30'), next('00:00'), '23:30–00:00 · 함께 30분'));

    // 30 minutes on: 00:00 to 00:30.
    await dragHandle('until', 60);

    expect(askedWindow()).toEqual({ from: null, until: '24:30' });
  });

  it('asks the band moved whole past midnight from "24:00"', async () => {
    await meetMinSu(lateAnswer(at('23:30'), next('00:00'), '23:30–00:00 · 함께 30분'));

    await dragBody(60);

    expect(askedWindow()).toEqual({ from: '24:00', until: null });
  });
});

describe('a band wholly after midnight', () => {
  it('moves, and asks its start at 00:30 as "24:30"', async () => {
    await meetMinSu(lateAnswer(next('00:10'), next('01:00'), '00:10–01:00 · 함께 50분'));

    await dragHandle('from', 40);

    expect(askedWindow()).toEqual({ from: '24:30', until: null });
  });

  it('shows no hour past 23 in any word the User reads while it is held', async () => {
    await meetMinSu(lateAnswer(next('00:10'), next('01:00'), '00:10–01:00 · 함께 50분'));

    await dragHandle('from', 40);

    expect(screen.toJSON()).not.toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/(?<![:\d])(?:2[4-9]|3\d|4[0-7]):\d\d(?![:\d])/u);
  });
});
