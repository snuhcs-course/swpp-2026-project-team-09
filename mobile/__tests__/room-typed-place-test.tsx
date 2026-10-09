import { within } from '@testing-library/react-native';
import type { SubQuest } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, answerRoom, openRoom, PICNIC } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// The place of a Sub Quest typed in the room's 일정 form: the Place the words name, or else the words alone, against
// the fake main server.

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

function step(index: number): SubQuest {
  const found = PICNIC.subQuests[index];
  if (found === undefined) {
    throw new Error(`No Sub Quest ${String(index)}`);
  }
  return found;
}

const MEET = step(0);
const PICNIC_STEP = step(1);
const STEPS = `/quests/${PICNIC.id}/sub-quests`;
const ENGINEERING = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };
const ENGINEERING2 = { id: 'p302', number: '302', name: '제2공학관', latitude: 37.44887, longitude: 126.95265 };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  server.on('GET /places', { status: 200, body: [ENGINEERING, ENGINEERING2] });
  server.on(`POST ${STEPS}`, { status: 201, body: MEET });
  server.on(`PUT ${STEPS}/${MEET.id}`, { status: 200, body: MEET });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The form for a new Sub Quest up to `어디서`, with the words typed there.
async function typePlace(words: string): Promise<Awaited<ReturnType<typeof openRoom>>> {
  const user = await openRoom();
  await user.press(screen.getByRole('button', { name: '일정 추가' }));
  await user.type(screen.getByLabelText('내용'), '모이기');
  await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));
  await answer(user, '확인');
  await user.type(screen.getByLabelText('어디서'), words);
  return user;
}

function added(): unknown[] {
  return server.received(`POST ${STEPS}`).map(({ body }) => body);
}

function edited(): unknown[] {
  return server.received(`PUT ${STEPS}/${MEET.id}`).map(({ body }) => body);
}

describe('typed words that name a Place', () => {
  it.each(['301동', '301', '제1공학관', '제1공학관 (301동)', '제1공학관 301동', ' 제1 공학관301동 '])(
    'save that Place: %j',
    async (words) => {
      const user = await typePlace(words);

      await answer(user, '추가');

      expect(added()).toEqual([{ title: '모이기', startsAt: '2026-10-06T10:00:00.000Z', place: { placeId: 'p301' } }]);
    },
  );
});

describe('typed words that name no single Place', () => {
  it.each(['서울대입구역', '공학관', '30'])(
    'save the words alone, with no hint to pick on the map: %j',
    async (words) => {
      const user = await typePlace(words);
      expect(screen.queryByText('지도에서 위치를 골라 주세요')).toBeNull();
      expect(screen.getByRole('button', { name: '추가' })).toBeEnabled();

      await answer(user, '추가');

      expect(added()).toEqual([{ title: '모이기', startsAt: '2026-10-06T10:00:00.000Z', place: { label: words } }]);
    },
  );

  it('save the words alone when they name more than one Place', async () => {
    const user = await typePlace('제1공학관');
    server.on('GET /places', { status: 200, body: [ENGINEERING, { ...ENGINEERING, id: 'p301-1', number: '301-1' }] });

    await answer(user, '추가');

    expect(added()).toEqual([{ title: '모이기', startsAt: '2026-10-06T10:00:00.000Z', place: { label: '제1공학관' } }]);
  });
});

describe('a Sub Quest whose place is words alone', () => {
  const station = { placeId: null, label: '서울대입구역', latitude: null, longitude: null };
  const typed = { ...PICNIC, subQuests: [{ ...MEET, place: station }, PICNIC_STEP] };

  it('shows its words, and keeps them or names a Place when edited', async () => {
    answerRoom(server, typed);
    const user = await openRoom(typed);
    expect(within(screen.getByLabelText('일정')).getByText('서울대입구역')).toBeVisible();

    await user.press(screen.getAllByRole('button', { name: '일정 수정' })[0]);
    expect(screen.getByDisplayValue('서울대입구역')).toBeVisible();
    await answer(user, '수정');
    await user.press(screen.getAllByRole('button', { name: '일정 수정' })[0]);
    await user.clear(screen.getByLabelText('어디서'));
    await user.type(screen.getByLabelText('어디서'), '301동');
    await answer(user, '수정');

    expect(edited()).toEqual([
      { title: MEET.title, startsAt: MEET.startsAt, place: { label: '서울대입구역' } },
      { title: MEET.title, startsAt: MEET.startsAt, place: { placeId: 'p301' } },
    ]);
  });
});

describe('a point picked on the map', () => {
  it('stays a point when its words change', async () => {
    const user = await openRoom();

    await user.press(screen.getAllByRole('button', { name: '일정 수정' })[0]);
    await user.type(screen.getByLabelText('어디서'), ' 로비');
    await answer(user, '수정');

    expect(edited()).toEqual([
      {
        title: MEET.title,
        startsAt: MEET.startsAt,
        place: { latitude: 37.45091, longitude: 126.95289, label: '301동 앞 로비' },
      },
    ]);
  });
});
