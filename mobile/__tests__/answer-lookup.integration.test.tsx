/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { FRIEND_LOOKUP_REPLY } from '@/api/mock/data/friend-lookup';
import { MENU_LOOKUP_REPLY } from '@/api/mock/data/menu-lookup';
import { pass, screen } from './support/app';
import { card, mapLines, mapThings, timeBar } from './support/answer-map';
import { AI_INPUT } from './support/lists';
import { givePhone, ME, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// A Lookup in the answer frame (P01 ticket 11) over the mocks, whose Assistant answers "문화관이 어디야?", "오늘
// 301동식당 메뉴 뭐야?", and "민수 어디야?" with the main server's real Lookups (boards q1, q8, and q6). Since P04
// ticket 05 a Lookup docks: its main button beside the input, and the line of words the map does not show.

// The model's words beside the stored menu and Friend Lookups, which are the dock's line (P04 ticket 18).
const MENU_WORDS = MENU_LOOKUP_REPLY.text;
const FRIEND_WORDS = FRIEND_LOOKUP_REPLY.text;

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// A docked way's card is raised from a second turn's "지난 답 1개": two replies in one test.
jest.setTimeout(150000);

const CLOSE = '답 닫기';
const CULTURE_HALL = { latitude: 37.46159, longitude: 126.95104 };

let findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');

beforeEach(async () => {
  jest.useFakeTimers();
  findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(3000);
}

async function ask(words: string): Promise<User> {
  const user = await openMain();
  await pass(500);
  await send(user, words);
  return user;
}

// A way docks with nothing to read: asked after where 민수 is, its card is raised from "지난 답 1개".
async function raisedAfter(words: string): Promise<User> {
  const user = await ask('민수 어디야?');
  await send(user, words);
  await user.press(card().getByRole('button', { name: '지난 답 1개' }));
  return user;
}

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

// Partitions: the dock, the raised card, and the basis closed and opened. Expected values: the copy of board q1.
describe('the card of a way to a Place (q1)', () => {
  it('docks with "길 안내" beside the input and nothing the map says: no chips, lines, or "닫기"', async () => {
    await ask('문화관이 어디야?');

    expect(beside().getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(card().queryByText('301동에서')).toBeNull();
    expect(card().queryByText('문화관(73동)은 여기예요')).toBeNull();
    expect(card().queryByText('셔틀은 18분 걸려 걸어요')).toBeNull();
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(card().queryByRole('button', { name: '닫기' })).toBeNull();
    expect(card().queryByRole('button', { name: '이대로 초대' })).toBeNull();
    expect(card().queryByRole('button', { name: '다음 후보' })).toBeNull();
    expect(card().queryByRole('button', { name: '같이 먹을 친구 추가' })).toBeNull();
  });

  it('shows the chips, which take no press, the two lines, and "닫기" raised, with "길 안내" still beside the input', async () => {
    await raisedAfter('문화관이 어디야?');

    expect(card().getByText('301동에서')).toBeVisible();
    expect(card().queryByRole('button', { name: '301동에서' })).toBeNull();
    expect(card().getByText('문화관(73동)은 여기예요')).toBeVisible();
    expect(card().getByText('지금 있는 301동에서 걸어서 18분')).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeVisible();
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(beside().getByRole('button', { name: '길 안내' })).toBeVisible();
  });

  it('opens the basis with "근거" and closes it with "근거 접기"', async () => {
    const user = await raisedAfter('문화관이 어디야?');
    expect(card().queryByText('셔틀은 18분 걸려 걸어요')).toBeNull();

    await user.press(card().getByRole('button', { name: '근거' }));

    expect(card().getByText('301동 → 문화관(73동) 걸어서 18분 · 앱의 도보표')).toBeVisible();
    expect(card().getByText('셔틀은 18분 걸려 걸어요')).toBeVisible();

    await user.press(card().getByRole('button', { name: '근거 접기' }));

    expect(card().queryByText('셔틀은 18분 걸려 걸어요')).toBeNull();
  });
});

// Partitions: the map while the Lookup is shown, after "길 안내", and after ✕. Expected values: the copy of board q1.
describe('the map of a way to a Place (q1)', () => {
  it('draws the Place and the walk on the map in place of the everyday walking route', async () => {
    await ask('문화관이 어디야?');

    expect(mapThings()).toEqual(expect.arrayContaining(['나', '문화관(73동) · 걸어서 18분']));
    expect(mapThings()).not.toContain(ME);
    expect(mapLines()).toEqual(['answer:route:0']);
  });

  it('starts the route guidance to the Place with "길 안내" and returns to the everyday map', async () => {
    const user = await ask('문화관이 어디야?');

    await user.press(beside().getByRole('button', { name: '길 안내' }));
    await pass(500);

    expect(findWalkingRoute).toHaveBeenLastCalledWith(ON_CAMPUS, CULTURE_HALL);
    expect(screen.getByText('문화관(73동)까지 길 안내')).toBeVisible();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(mapLines()).toContain('walking-route');
  });

  it('returns to the everyday map with ✕', async () => {
    const user = await ask('문화관이 어디야?');

    await user.press(screen.getByRole('button', { name: CLOSE }));

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(mapLines()).toContain('walking-route');
    expect(mapLines()).not.toContain('answer:route:0');
    expect(mapThings()).not.toContain('문화관(73동) · 걸어서 18분');
  });
});

// Partitions: a Lookup with a band, its line in the dock, the card it raises, and its marks. Expected values: the copy
// of board q8.
describe('a menu (q8)', () => {
  it('docks with the model\'s words, the band without handles on the time bar, and "길 안내" beside the input', async () => {
    await ask('오늘 301동식당 메뉴 뭐야?');

    expect(card().getByText(MENU_WORDS)).toBeVisible();
    expect(card().queryByText('12:45까지 55분 먹을 수 있어요')).toBeNull();
    expect(timeBar().getByText('11:50–12:45 · 식사 55분')).toBeVisible();
    expect(screen.queryByLabelText('시작 시각')).toBeNull();
    expect(screen.queryByLabelText('끝 시각')).toBeNull();
    expect(beside().getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(card().queryByRole('button', { name: '닫기' })).toBeNull();
  });

  it('raises the chips, both lines, and "닫기" at a press on the line', async () => {
    const user = await ask('오늘 301동식당 메뉴 뭐야?');

    await user.press(card().getByText(MENU_WORDS));

    expect(card().getByText('301동식당 오늘 점심은 부대짬뽕&군만두')).toBeVisible();
    expect(card().getByText('13:00 수업까지')).toBeVisible();
    expect(card().getByText('12:45까지 55분 먹을 수 있어요')).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeVisible();
  });

  it('draws the 식당 with its menu, and the way on to the next Class', async () => {
    await ask('오늘 301동식당 메뉴 뭐야?');

    expect(mapThings()).toEqual(
      expect.arrayContaining(['301동식당 · 부대짬뽕&군만두 · (뚝)순댓국&계란장조림', '13:00 수업 · 24동']),
    );
    expect(mapLines()).toEqual(['answer:route:0']);
  });
});

// Partitions: a Lookup whose only action is `meet` (ticket 24), its line in the dock, a person's chip, and "닫기".
// Expected values: the copy of board q6.
describe('where a Friend is (q6)', () => {
  it('docks with the model\'s words and "만나고 싶다" beside the input, and draws his face', async () => {
    await ask('민수 어디야?');

    expect(card().getByText(FRIEND_WORDS)).toBeVisible();
    expect(card().queryByText('12:15까지 수업이에요')).toBeNull();
    expect(beside().getByRole('button', { name: '만나고 싶다' })).toBeVisible();
    expect(mapThings()).toContain('민수 · 지금 302동');
  });

  it('shows 민수\'s chip with no ✕, the lines, and "닫기" raised by a press on the line', async () => {
    const user = await ask('민수 어디야?');

    await user.press(card().getByText(FRIEND_WORDS));

    // The chip, and the strong word of the first line.
    expect(card().getAllByText('민수')).toHaveLength(2);
    expect(card().queryByRole('button', { name: '민수 빼기' })).toBeNull();
    expect(card().getByText('민수는 지금 302동이에요')).toBeVisible();
    expect(card().getByText('12:15까지 수업이에요')).toBeVisible();
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(card().queryByRole('button', { name: '만나고 싶다' })).toBeNull();
    expect(beside().getByRole('button', { name: '만나고 싶다' })).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeVisible();
  });

  it("keeps the User's own Avatar, which the Lookup does not draw", async () => {
    await ask('민수 어디야?');

    expect(mapThings()).toContain(ME);
  });

  it('returns to the everyday map with "닫기" of the raised card', async () => {
    const user = await ask('민수 어디야?');

    await user.press(card().getByText(FRIEND_WORDS));
    await user.press(card().getByRole('button', { name: '닫기' }));

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(mapThings()).not.toContain('민수 · 지금 302동');
  });
});

// Partitions: "길 안내" while the phone has told no position yet. Expected values: the main screen's "길찾기" without a
// position (`useRoute`, `useMe`).
describe('"길 안내" without a position', () => {
  it('says that the position is being found, and the answer stays', async () => {
    givePhone({ permission: 'granted' });
    const user = await ask('문화관이 어디야?');
    // The Lookup's own walk to 문화관 is asked for its line (P15 ticket 56); 길 안내 asks nothing more.
    const before = findWalkingRoute.mock.calls.length;

    await user.press(beside().getByRole('button', { name: '길 안내' }));
    await pass(500);

    expect(screen.getByText('위치를 찾는 중이에요')).toBeVisible();
    expect(findWalkingRoute.mock.calls.slice(before).map(([, to]) => to)).not.toContainEqual(CULTURE_HALL);
    expect(screen.getByTestId('answer-pill')).toBeVisible();
    expect(beside().getByRole('button', { name: '길 안내' })).toBeVisible();
  });
});
