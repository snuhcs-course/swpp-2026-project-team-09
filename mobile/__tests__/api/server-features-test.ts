// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by Jaehyun0320 and fyoon46
import type * as SecureStoreFake from '../support/secure-store';
import { refusal } from '../support/fake-server';
import { startFresh } from '../support/mocks';
import {
  answerMainScreen,
  askMainServer,
  DINNER,
  JI_WOO,
  LOBBY,
  ME_ID,
  MIN_JUN,
  PHONE_NOW,
  TOKENS,
} from '../support/server';
import { apiClient } from '@/api/client';
import type { MyParty, OnboardingAnswers, Party } from '@/api/types';
import { googleAvailable } from '@/auth/google';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { toFriendViews } from '@/features/friends/adapter';
import { toActiveParty } from '@/features/parties/adapter';
import { toNextQuest, toQuestRows } from '@/features/quests/adapter';
import { listenToSession, type SessionEvent } from '@/session/session-events';
import { readKept } from '@/storage/kept';

// Each feature the main server serves, read through the client and the feature's adapter, and what stays a mock.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const BEARER = `Bearer ${TOKENS.accessToken}`;

// The events of the Session, as the screens would follow them.
let events: SessionEvent[] = [];
let stopListening = (): void => undefined;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
  events = [];
  stopListening = listenToSession((event) => {
    events.push(event);
  });
});

afterEach(() => {
  stopListening();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the Friends from the main server', () => {
  it("gives the Friends and their positions, which the friend list's adapter joins", async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);

    const friends = await apiClient.listFriends();
    const positions = await apiClient.listPositions();

    expect(toFriendViews(friends, positions, [], now())).toEqual([
      {
        id: MIN_JUN.id,
        name: '김민준',
        department: '컴퓨터공학부',
        presence: 'free',
        line: '공강',
        detail: '',
        walk: '',
        photo: null,
        position: { latitude: 37.4598, longitude: 126.9521 },
        minutesOld: null,
        visible: true,
        sharing: true,
      },
      {
        id: JI_WOO.id,
        name: '서지우',
        department: '경영학과',
        presence: 'off',
        line: '위치 꺼짐',
        detail: '',
        walk: '',
        photo: null,
        position: null,
        minutesOld: null,
        visible: false,
        sharing: true,
      },
    ]);
  });
});

describe('the Quests from the main server', () => {
  it("gives the Quests, which the Quest list's adapter words for the User of the access token", async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);

    const quests = await apiClient.listQuests();
    const rows = toQuestRows({ quests, myParty: null, parties: [], meId: myUserId(), now: now() });

    expect(rows).toEqual([
      expect.objectContaining({
        id: DINNER.id,
        kind: 'party',
        tone: 'closed',
        joinPolicy: null,
        title: '저녁 약속',
        place: '학생회관 (63동)',
        position: { latitude: 37.45932, longitude: 126.95058 },
      }),
    ]);
    expect(rows[0]?.kicker).toContain('김민준');
    expect(toNextQuest(quests, now())).toEqual({
      id: DINNER.id,
      title: '저녁 약속',
      position: { latitude: 37.45932, longitude: 126.95058 },
    });
  });
});

// The User's Party, with 김민준, who shares with the User.
const LUNCH: MyParty = {
  id: 'p1',
  title: '점심 같이',
  capacity: 4,
  joinPolicy: 'open',
  quest: { id: DINNER.id, title: '저녁 약속', globalEvent: null },
  sharing: true,
  members: [
    { id: ME_ID, name: '홍길동', department: '컴퓨터공학부', leader: true, visible: true },
    { id: MIN_JUN.id, name: '김민준', department: '컴퓨터공학부', leader: false, visible: true },
  ],
};

describe('the Parties from the main server', () => {
  it("gives the User's Party, which 활성 파티's adapter counts without the User", async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /parties/mine', { status: 200, body: LUNCH });

    const mine = await apiClient.getMyParty();

    expect(mine).toEqual(LUNCH);
    expect(toActiveParty(mine, myUserId())).toEqual({ id: 'p1', title: '점심 같이', line: '1명 공유 중' });
  });

  it('gives null for a User in no Party, which is no failure', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);

    expect(await apiClient.getMyParty()).toBeNull();
    expect(events).toEqual([]);
  });

  it('throws a 404 of another code from the Party', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /parties/mine', refusal(404, 'PARTY_NOT_FOUND'));

    await expect(apiClient.getMyParty()).rejects.toMatchObject({ status: 404, code: 'PARTY_NOT_FOUND' });
  });

  it('lists the Parties the User may see, each with the Quest it is marked with', async () => {
    const server = await askMainServer({ signedIn: true });
    const party: Party = {
      id: 'p2',
      title: 'AI 커리어 설명회 같이 가요',
      memberCount: 3,
      capacity: 6,
      joinPolicy: 'open',
      quest: { id: 'q1', title: 'AI 커리어 설명회', globalEvent: { id: 'e1', title: 'AI 커리어 설명회' } },
      holdsQuest: false,
      friends: [{ id: MIN_JUN.id, name: '김민준', department: '컴퓨터공학부' }],
    };
    server.on('GET /parties', { status: 200, body: [party] });

    expect(await apiClient.listParties()).toEqual([party]);
  });
});

describe('the walking route and the Lobby from the main server', () => {
  it('asks the walking route between the two points', async () => {
    const server = await askMainServer({ signedIn: true });
    const route = {
      status: 'OK',
      route: { line: [{ latitude: 37.4593, longitude: 126.9506 }], distance: 120, duration: 100 },
    };
    server.on('GET /walking-route', { status: 200, body: route });

    const answer = await apiClient.findWalkingRoute(
      { latitude: 37.45932, longitude: 126.95058 },
      { latitude: 37.4594, longitude: 126.95199 },
    );

    expect(answer).toEqual(route);
    expect(server.received('GET /walking-route')[0]?.query).toEqual({
      startLatitude: '37.45932',
      startLongitude: '126.95058',
      endLatitude: '37.4594',
      endLongitude: '126.95199',
    });
  });

  it('enters the Lobby, which the main server lets in only after Onboarding', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);

    expect(await apiClient.enterLobby()).toEqual(LOBBY);
    expect((await readKept()).onboardingCompleted).toBe(true);
  });
});

describe('Onboarding with the main server', () => {
  it('completes Onboarding with the four fields the main server stores, and keeps all six on the phone', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /users/me/onboarding', { status: 204 });
    const answers: OnboardingAnswers = {
      name: '홍길동',
      department: '컴퓨터공학부',
      admissionYear: 2022,
      hashtags: ['AI커리어'],
      courseLevel: 'graduate',
      gender: { kind: 'female' },
    };

    await apiClient.completeOnboarding(answers);

    expect(server.received('POST /users/me/onboarding')).toEqual([
      {
        method: 'POST',
        path: '/users/me/onboarding',
        query: {},
        authorization: BEARER,
        body: { name: '홍길동', department: '컴퓨터공학부', admissionYear: 2022, hashtags: ['AI커리어'] },
      },
    ]);
    expect(await readKept()).toMatchObject({ onboardingCompleted: true, answers, suggestion: null });
  });

  it('keeps nothing when the main server refuses the Onboarding', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /users/me/onboarding', refusal(400));

    await expect(
      apiClient.completeOnboarding({
        name: '홍길동',
        department: '컴퓨터공학부',
        admissionYear: null,
        hashtags: [],
        courseLevel: 'undergraduate',
        gender: null,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect((await readKept()).onboardingCompleted).toBe(false);
  });
});

describe('what the main server does not serve', () => {
  it("stays the mock's: the Friends' statuses, who announced the Global Events and 오늘의 발자국", async () => {
    const server = await askMainServer({ signedIn: true });

    const asked = Promise.all([
      apiClient.listFriendStatuses(),
      apiClient.listGlobalEventAnnouncers(),
      apiClient.getFootprints(),
    ]);
    await jest.runAllTimersAsync();
    const [statuses, announcers, footprints] = await asked;

    expect(statuses).toHaveLength(12);
    expect(announcers).toHaveLength(1);
    expect(footprints.friendCount).toBe(5);
    expect(server.received()).toEqual([]);
  });
});
