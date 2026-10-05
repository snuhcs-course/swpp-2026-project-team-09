import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import { ApiError } from '@/api/errors';
import { signIn } from '@/auth/sign-in';

const STUDENT_CENTRE = { latitude: 37.45932, longitude: 126.95058 };
const LIBRARY = { latitude: 37.4594, longitude: 126.95199 };

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the mock of Friends', () => {
  it('lists the Friends by name, each with whether the User can see them', async () => {
    const friends = await answered(mockClient.listFriends());

    expect(friends).toHaveLength(12);
    expect(friends.map(({ name }) => name)).toEqual(
      friends.map(({ name }) => name).toSorted((a, b) => a.localeCompare(b, 'ko')),
    );
    expect(friends.find(({ name }) => name === '김민준')).toEqual({
      id: 'f1',
      name: '김민준',
      department: '컴퓨터공학부',
      sharing: true,
      visible: true,
    });
    expect(friends.filter(({ visible }) => !visible).map(({ name }) => name)).toEqual(['서지우', '신예린']);
  });

  it('gives a position on the campus for everyone the User can see, and for nobody else', async () => {
    const friends = await answered(mockClient.listFriends());
    const positions = await answered(mockClient.listPositions());

    const seen = friends.filter(({ visible }) => visible).map(({ id }) => id);
    expect(positions.map(({ userId }) => userId).toSorted()).toEqual([...seen, 'pm1'].toSorted());
    for (const { latitude, longitude, measuredAt } of positions) {
      expect(latitude).toBeGreaterThan(37.445);
      expect(latitude).toBeLessThan(37.471);
      expect(longitude).toBeGreaterThan(126.945);
      expect(longitude).toBeLessThan(126.963);
      expect(new Date(measuredAt).toISOString()).toBe(measuredAt);
    }
  });

  it("gives every Friend's status, which no answer of the main server holds", async () => {
    const statuses = await answered(mockClient.listFriendStatuses());

    expect(statuses).toHaveLength(12);
    expect(statuses.find(({ userId }) => userId === 'f1')).toEqual({
      userId: 'f1',
      presence: 'free',
      where: '중앙도서관',
      detail: '공강 · 중앙도서관 근처 · 15:00까지 비어 있어요',
      walk: '도보 4분',
      photo: null,
    });
  });
});

describe('the mock of Quests and Global Events', () => {
  it("lists the User's Quests and then today's class", async () => {
    const quests = await answered(mockClient.listQuests());

    expect(quests.map(({ title, classQuest }) => [title, classQuest])).toEqual([
      ['AI 커리어 설명회', false],
      ['저녁 약속', false],
      ['자료구조', true],
    ]);
    expect(quests[2]?.subQuests[0]).toMatchObject({
      attending: false,
      startsAt: '2026-10-01T05:00:00.000Z',
      place: { label: '301동 118호', latitude: 37.45016, longitude: 126.95259 },
      completion: 'by_time',
    });
  });

  it('lists the published Global Events and who announced them', async () => {
    expect(await answered(mockClient.listGlobalEvents())).toEqual([
      {
        id: 'e1',
        title: 'AI 커리어 설명회',
        description: '',
        startsAt: '2026-10-01T09:00:00.000Z',
        endsAt: '2026-10-01T11:00:00.000Z',
        place: '301동 대강당',
        latitude: 37.45016,
        longitude: 126.95259,
        sourceUrl: null,
      },
    ]);
    expect(await answered(mockClient.listGlobalEventAnnouncers())).toEqual([
      { eventId: 'e1', announcer: '컴퓨터공학부 공지' },
    ]);
  });
});

describe('the mock of Parties', () => {
  it("lists the Parties and gives the User's own, each marked with its Quest", async () => {
    const parties = await answered(mockClient.listParties());
    const mine = await answered(mockClient.getMyParty());

    expect(parties).toEqual([
      {
        id: 'm1',
        title: 'AI 커리어 설명회 같이 가요',
        capacity: 6,
        joinPolicy: 'open',
        memberCount: 4,
        quest: { id: 'q-ai', title: 'AI 커리어 설명회', globalEvent: { id: 'e1', title: 'AI 커리어 설명회' } },
        holdsQuest: true,
        friends: [{ id: 'f1', name: '김민준', department: '컴퓨터공학부' }],
      },
    ]);
    expect(mine).toMatchObject({ id: 'm1', sharing: true, quest: { id: 'q-ai' } });
    expect(mine?.members.map(({ name, leader }) => [name, leader])).toEqual([
      ['정하은', true],
      ['김민준', false],
      ['오현우', false],
      ['안진영', false],
    ]);
  });

  it('counts what waits for the User in Parties, which no answer of the main server holds', async () => {
    expect(await answered(mockClient.getPartyNews())).toEqual({ count: 3 });

    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getPartyNews';
    expect(await answered(mockClient.getPartyNews())).toEqual({ count: 0 });
  });
});

describe('the mock of 오늘의 발자국', () => {
  it('counts the Friends who left a story today and gives three faces, which no answer of the main server holds', async () => {
    const footprints = await answered(mockClient.getFootprints());

    expect(footprints.friendCount).toBe(5);
    expect(footprints.faces.map(({ name }) => name)).toEqual(['김민준', '이서연', '박지호']);

    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getFootprints';
    expect(await answered(mockClient.getFootprints())).toEqual({ friendCount: 0, faces: [] });
  });
});

describe('the mock of the walking route', () => {
  it('draws a walking route from the first point to the second', async () => {
    const answer = await answered(mockClient.findWalkingRoute(STUDENT_CENTRE, LIBRARY));

    expect(answer.status).toBe('OK');
    expect(answer.route?.line.at(0)).toEqual(STUDENT_CENTRE);
    expect(answer.route?.line.at(-1)).toEqual(LIBRARY);
    expect(answer.route?.distance).toBeGreaterThan(100);
    expect(answer.route?.distance).toBeLessThan(250);
    expect(answer.route?.duration).toBeGreaterThan(60);
  });

  it('has no route from a point to itself', async () => {
    expect(await answered(mockClient.findWalkingRoute(LIBRARY, LIBRARY))).toEqual({
      status: 'SAME_POINT',
      route: null,
    });
  });
});

describe('a mock under a development setting', () => {
  it('answers with a failure when it is named to fail', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listFriends, enterLobby';

    await expect(answered(mockClient.listFriends())).rejects.toBeInstanceOf(ApiError);
    await expect(answered(mockClient.enterLobby())).rejects.toMatchObject({ status: 500 });
    expect(await answered(mockClient.listQuests())).toHaveLength(3);
  });

  it('answers with nothing when it is named to be empty', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY =
      'listFriends,listPositions,listFriendStatuses,listQuests,listGlobalEvents,listGlobalEventAnnouncers,listParties,getMyParty,findWalkingRoute';

    expect(await answered(mockClient.listFriends())).toEqual([]);
    expect(await answered(mockClient.listPositions())).toEqual([]);
    expect(await answered(mockClient.listFriendStatuses())).toEqual([]);
    expect(await answered(mockClient.listQuests())).toEqual([]);
    expect(await answered(mockClient.listGlobalEvents())).toEqual([]);
    expect(await answered(mockClient.listGlobalEventAnnouncers())).toEqual([]);
    expect(await answered(mockClient.listParties())).toEqual([]);
    expect(await answered(mockClient.getMyParty())).toBeNull();
    expect(await answered(mockClient.findWalkingRoute(STUDENT_CENTRE, LIBRARY))).toEqual({
      status: 'ROUTE_RESULT_NOT_FOUND',
      route: null,
    });
  });
});

describe("a mock's wait", () => {
  it('is short, and long when the mock is named to be slow', async () => {
    process.env.EXPO_PUBLIC_MOCK_SLOW = 'listQuests';
    const done = jest.fn<void, [string]>();
    void mockClient.listFriends().then(() => {
      done('friends');
    });
    void mockClient.listQuests().then(() => {
      done('quests');
    });

    await jest.advanceTimersByTimeAsync(299);
    expect(done).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(done.mock.calls).toEqual([['friends']]);
    await jest.advanceTimersByTimeAsync(2700);
    expect(done.mock.calls).toEqual([['friends'], ['quests']]);
  });
});

describe('a released app', () => {
  it('ignores the development settings', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listFriends';
    process.env.EXPO_PUBLIC_SIGN_IN_ENDING = 'failed';
    const development = __DEV__;
    Object.assign(globalThis, { __DEV__: false });
    try {
      expect(await answered(mockClient.listFriends())).toHaveLength(12);
      expect((await answered(signIn())).outcome).toBe('signed-in');
    } finally {
      Object.assign(globalThis, { __DEV__: development });
    }
  });
});
