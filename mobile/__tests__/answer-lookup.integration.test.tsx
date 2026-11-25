/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { FRIEND_LOOKUP_REPLY } from '@/api/mock/data/friend-lookup';
import { pass, screen } from './support/app';
import { grip, raiseCard } from './support/card-grip';
import { card, mapLines, mapThings } from './support/answer-map';
import { AI_INPUT, layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ME, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// A Lookup in the answer frame (P01 ticket 11) over the mocks, whose Assistant answers "문화관이 어디야?" and "민수
// 어디야?" with the main server's real Lookups (boards q1 and q6). Since P04 ticket 05 a Lookup docks: its main button
// beside the input, and the line of words the map does not show. A menu question is no Lookup since P04 ticket 72
// (`answer-menu-question.integration.test.tsx`).

// The model's words beside the stored Friend Lookup, which are the dock's line (P04 ticket 18).
const FRIEND_WORDS = FRIEND_LOOKUP_REPLY.text;

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// Two replies in some tests.
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

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

// Partitions: the sheet of a way, laid out once (P04 ticket 61). Expected values: the copy of board q1.
describe('the card of a way to a Place (q1)', () => {
  it('holds the Lookup in one sheet with "길 안내" beside the input, and no buttons of its own', async () => {
    await ask('문화관이 어디야?');

    expect(beside().getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(card().getByText('301동에서')).toBeOnTheScreen();
    expect(card().getByText('문화관(73동)은 여기예요')).toBeOnTheScreen();
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(card().queryByRole('button', { name: '닫기' })).toBeNull();
    expect(card().queryByRole('button', { name: '이대로 초대' })).toBeNull();
    expect(card().queryByRole('button', { name: '다음 후보' })).toBeNull();
    expect(screen.queryByRole('button', { name: '같이 먹을 친구 추가' })).toBeNull();
  });
});

// Partitions: the map while the Lookup is shown, after "길 안내", and after ✕. Expected values: the copy of board q1.
describe('the map of a way to a Place (q1)', () => {
  it('draws the Place and the walk on the map in place of the everyday walking route', async () => {
    await ask('문화관이 어디야?');

    expect(mapThings()).toEqual(expect.arrayContaining(['나', '문화관(73동) · 걸어서 18분']));
    expect(mapThings()).not.toContain(ME);
    // The walk's path comes after the reply, and no line is drawn while it is on its way (P04 ticket 75).
    await pass(500);
    expect(mapLines()).toEqual(['answer:route:0']);
  });

  it('starts the route guidance to the Place with "길 안내" and returns to the everyday map', async () => {
    const user = await ask('문화관이 어디야?');

    await user.press(beside().getByRole('button', { name: '길 안내' }));
    await pass(500);

    expect(findWalkingRoute).toHaveBeenLastCalledWith(ON_CAMPUS, CULTURE_HALL);
    expect(screen.getByText('문화관(73동)까지 길 안내')).toBeVisible();
    expect(screen.queryByTestId('answer-caption')).toBeNull();
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

// Partitions: a Lookup whose only action is `meet` (ticket 24), its sheet, a person's chip, and ✕. Expected values:
// the copy of board q6.
describe('where a Friend is (q6)', () => {
  it('starts with the model\'s words and "만나고 싶다" beside the input, and draws his face', async () => {
    await ask('민수 어디야?');

    expect(card().getByText(FRIEND_WORDS)).toBeVisible();
    expect(beside().getByRole('button', { name: '만나고 싶다' })).toBeVisible();
    expect(mapThings()).toContain('민수 · 지금 302동');
  });

  it("shows 민수's chip with no ✕ of its own, and the lines raised, under the card's ✕", async () => {
    await ask('민수 어디야?');

    await raiseCard();

    // The chip, and the strong word of the first line.
    expect(card().getAllByText('민수')).toHaveLength(2);
    expect(card().queryByRole('button', { name: '민수 빼기' })).toBeNull();
    expect(card().getByText('민수는 지금 302동이에요')).toBeVisible();
    expect(card().getByText('12:15까지 수업이에요')).toBeVisible();
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(card().queryByRole('button', { name: '만나고 싶다' })).toBeNull();
    expect(beside().getByRole('button', { name: '만나고 싶다' })).toBeVisible();
    expect(card().getByRole('button', { name: '답 닫기' })).toBeVisible();
  });

  it("keeps the User's own Avatar, which the Lookup does not draw", async () => {
    await ask('민수 어디야?');

    expect(mapThings()).toContain(ME);
  });

  it('returns to the everyday map with ✕ of the raised card', async () => {
    const user = await ask('민수 어디야?');

    await raiseCard();
    await user.press(card().getByRole('button', { name: '답 닫기' }));

    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(mapThings()).not.toContain('민수 · 지금 302동');
  });
});

// P04 ticket 63, the user's phone check: a press on the Lookup's own mark raises its sheet from low to middle, not to
// high, which only the User's drag or a screen reader's step reaches.
describe("a press on the Lookup's own mark", () => {
  it('raises the sheet from low to middle', async () => {
    const user = await ask('문화관이 어디야?');
    await layStage(390, 760);
    expect(grip()).toBeCollapsed();

    await pressMarker(user, '문화관(73동) · 걸어서 18분');

    expect(grip()).toHaveAccessibilityValue({ text: '중간' });
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
    expect(screen.getByTestId('answer-caption')).toBeVisible();
    expect(beside().getByRole('button', { name: '길 안내' })).toBeVisible();
  });
});
