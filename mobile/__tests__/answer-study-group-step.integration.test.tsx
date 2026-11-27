/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { STUDY_GROUP_TO_SEND } from '@/api/mock/data/study-group-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { inDock, sendFromBar, startLibraryChat } from './support/library-chat';
import { openMain } from './support/main';
import { ASKED_AT, SAID } from './support/study-group';
import { markLibraryLoggedIn } from '@/library/flag';

// P10 ticket 16 (a point from #655's review): the study answer together shown as one step of several requests keeps
// the main button its card tells, as it does alone. Against the fake main server and the fake library, logged in; the
// phone's clock stands on Wednesday 2026-11-04 at 19:10 in Korea, and the room is for tomorrow at 15:00.

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

const KWANJEONG = {
  placeId: 'a9b1c2d3-0000-4000-8000-000000000621',
  label: '62-1동',
  latitude: 37.45903,
  longitude: 126.95247,
};

// The seat asked first, which the library could not book for tomorrow, and the room together, shown.
const STEPS: ReplyStep[] = [
  {
    kind: 'seat',
    title: '7층 7A 열람실 2 구역',
    place: KWANJEONG,
    from: null,
    startAt: '2026-11-05T13:00:00+09:00',
    endAt: '2026-11-05T15:00:00+09:00',
    status: 'not-done',
    reason: '열람실은 당일만 예약할 수 있어요',
    shows: null,
  },
  {
    kind: 'study',
    title: '관정 4층 그룹스터디룸 6인실',
    place: KWANJEONG,
    from: KWANJEONG,
    startAt: '2026-11-05T15:00:00+09:00',
    endAt: '2026-11-05T17:00:00+09:00',
    status: 'shown',
    reason: null,
    shows: { kind: 'answer' },
  },
];

let server: FakeServer;

beforeEach(async () => {
  ({ server } = await startLibraryChat(ASKED_AT));
  await markLibraryLoggedIn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the group answer as the step shown. Expected values: the button the card tells alone (P10 ticket 11).
describe('The study answer together as a step of several requests', () => {
  it('has 동의 요청 보내기 beside the input, as alone', async () => {
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: SAID, mapButtons: [], cards: [], proposal: null, answer: STUDY_GROUP_TO_SEND, steps: STEPS },
    });
    const user = await openMain();
    await sendFromBar(user, '내일 13시에 관정 7층 자리 잡고, 15시에 민수, 서연, 지은이랑 같이 공부할 방도 찾아줘');
    await pass(500);

    expect(screen.getByTestId('step-span-2')).toBeVisible();
    expect(inDock().getByRole('button', { name: '동의 요청 보내기' })).toBeOnTheScreen();
  });
});
