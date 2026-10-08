import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, type Reply, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { ENGINEERING, SEVEN_PM, STUDY, UUID } from './support/meetups';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// Proposing a Meetup from the Friend panel against the fake main server: the body, its key, the place from the list
// or the map, and the refusals.

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

type User = Awaited<ReturnType<typeof openMain>>;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /places', { status: 200, body: [ENGINEERING] });
  server.on('GET /places/search', { status: 200, body: [ENGINEERING] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The form for 김민준 with a title, today at 19:00 and no place yet.
async function openForm(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
  await user.press(screen.getByRole('button', { name: '김민준님과 파티 만들기' }));
  await pass(300);
  await user.type(screen.getByLabelText('제목'), '점심');
  await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));
  await answer(user, '확인');
  return user;
}

async function pickEngineering(user: User): Promise<void> {
  await user.press(screen.getByRole('button', { name: '어디서 장소 선택' }));
  await pass(500);
  await user.type(screen.getByLabelText('장소 검색'), '301');
  await pass(300);
  await pass(500);
  await user.press(screen.getByRole('button', { name: '제1공학관 301동' }));
}

describe('proposing a Meetup', () => {
  it('sends the Place and the end, keeping one Idempotency-Key across a retry after no answer', async () => {
    let first = true;
    server.on('POST /meetups', () => {
      const reply: Reply | 'no-answer' = first ? 'no-answer' : { status: 201, body: { ...STUDY, id: 'mu3' } };
      first = false;
      return reply;
    });
    const user = await openForm();
    await user.press(screen.getByRole('button', { name: '끝나는 시간 선택 안 함' }));
    await user.press(screen.getByRole('button', { name: '21시' }));
    await answer(user, '확인');
    await pickEngineering(user);

    await answer(user, '파티 만들기');
    expect(toast()).toHaveTextContent('보내지 못했어요. 다시 시도해 주세요');
    await answer(user, '파티 만들기');

    const sent = server.received('POST /meetups');
    const body = {
      receiverId: MIN_JUN.id,
      title: '점심',
      startsAt: SEVEN_PM,
      endsAt: '2026-10-06T12:00:00.000Z',
      place: { placeId: 'p301' },
    };
    expect(sent.map((request) => request.body)).toEqual([body, body]);
    expect(sent[0]?.idempotencyKey).toMatch(UUID);
    expect(sent[1]?.idempotencyKey).toBe(sent[0]?.idempotencyKey);
    expect(toast()).toHaveTextContent('김민준님에게 파티 초대를 보냈어요');
    expect(shownAddress()).toBe('/main');
  });
});

describe('a place picked on the map', () => {
  it.each([
    ['inside', '제1공학관 301동', '건물 위치예요', { placeId: 'p301' }],
    ['near', '제1공학관 근처', '직접 찍은 위치 · 가장 가까운 건물 기준', { label: '제1공학관 근처' }],
    ['none', '지도에서 고른 위치', '직접 찍은 위치', { label: '지도에서 고른 위치' }],
  ])('is sent: %s a Place', async (relation, words, hint, place) => {
    server.on('GET /places/at', {
      status: 200,
      body: relation === 'none' ? { place: null, relation } : { place: ENGINEERING, relation },
    });
    server.on('POST /meetups', { status: 201, body: STUDY });
    const user = await openForm();
    await user.press(screen.getByRole('button', { name: '어디서 장소 선택' }));
    await pass(500);

    await user.press(screen.getByRole('button', { name: '지도에서 직접 찍기' }));
    await pass(500);
    expect(shownAddress()).toBe('/place-map');
    expect(screen.getByText(words)).toBeVisible();
    expect(screen.getByText(hint)).toBeVisible();
    await answer(user, '이 위치로 정하기');
    expect(screen.queryByRole('header', { name: '장소 선택' })).toBeNull();
    expect(screen.getByRole('button', { name: `어디서 ${words}` })).toBeVisible();
    await answer(user, '파티 만들기');

    const [{ query }] = server.received('GET /places/at').toReversed();
    const point = { latitude: Number(query.latitude), longitude: Number(query.longitude) };
    expect(server.received('POST /meetups').map((request) => request.body)).toEqual([
      {
        receiverId: MIN_JUN.id,
        title: '점심',
        startsAt: SEVEN_PM,
        place: 'placeId' in place ? place : { ...point, ...place },
      },
    ]);
  });
});

describe('a refused proposal', () => {
  it.each([
    [refusal(400, 'MEETUP_START_PASSED'), '시작 시간이 지났어요. 다시 골라 주세요'],
    [refusal(404, 'FRIEND_NOT_FOUND'), '김민준님과 더 이상 친구가 아니에요'],
    [refusal(404, 'PLACE_NOT_FOUND'), '장소를 다시 골라 주세요'],
    [refusal(500), '보내지 못했어요. 다시 시도해 주세요'],
  ])('says why a proposal was refused, and keeps the form: %j', async (reply, words) => {
    server.on('POST /meetups', reply);
    const user = await openForm();
    await pickEngineering(user);

    await answer(user, '파티 만들기');

    expect(toast()).toHaveTextContent(words);
    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
  });
});
