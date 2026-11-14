/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { apiClient } from '@/api/client';
import { pass, screen } from './support/app';
import { card, mapLines, mapThings } from './support/answer-map';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// A Lookup in the answer frame (P01 ticket 11) over the mocks, whose Assistant answers "문화관이 어디야?", "오늘
// 301동식당 메뉴 뭐야?", and "민수 어디야?" with the main server's real Lookups (boards q1, q8, and q6).

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

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

async function ask(words: string): Promise<User> {
  const user = await openMain({ answerOnMap: true });
  await pass(500);
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(3000);
  return user;
}

// Partitions: the card, and the basis closed and opened. Expected values: the copy of board q1.
describe('the card of a way to a Place (q1)', () => {
  it('shows the chips, which take no press, the two lines, "근거" closed, "길 안내", and "닫기"', async () => {
    await ask('문화관이 어디야?');

    expect(card().getByText('301동에서')).toBeVisible();
    expect(card().queryByRole('button', { name: '301동에서' })).toBeNull();
    expect(card().getByText('문화관(73동)은 여기예요')).toBeVisible();
    expect(card().getByText('지금 있는 301동에서 걸어서 18분')).toBeVisible();
    expect(card().queryByText('셔틀은 18분 걸려 걸어요')).toBeNull();
    expect(card().getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeVisible();
    expect(card().queryByRole('button', { name: '이대로 초대' })).toBeNull();
    expect(card().queryByRole('button', { name: '다음 후보' })).toBeNull();
    expect(card().queryByRole('button', { name: '같이 먹을 친구 추가' })).toBeNull();
  });

  it('opens the basis with "근거" and closes it with "근거 접기"', async () => {
    const user = await ask('문화관이 어디야?');

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
    expect(mapLines()).toEqual(['answer:route:0']);
  });

  it('starts the route guidance to the Place with "길 안내" and returns to the everyday map', async () => {
    const user = await ask('문화관이 어디야?');

    await user.press(card().getByRole('button', { name: '길 안내' }));
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

// Partitions: a Lookup with a band, and its marks. Expected values: the copy of board q8.
describe('a menu (q8)', () => {
  it('shows the lines, the band without handles, "길 안내", and "닫기"', async () => {
    await ask('오늘 301동식당 메뉴 뭐야?');

    expect(card().getByText('13:00 수업까지')).toBeVisible();
    expect(card().getByText('301동식당 오늘 점심은 부대짬뽕&군만두')).toBeVisible();
    expect(card().getByText('12:45까지 55분 먹을 수 있어요')).toBeVisible();
    expect(card().getByText('11:50–12:45 · 식사 55분')).toBeVisible();
    expect(screen.queryByLabelText('시작 시각')).toBeNull();
    expect(screen.queryByLabelText('끝 시각')).toBeNull();
    expect(card().getByRole('button', { name: '길 안내' })).toBeVisible();
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

// Partitions: a Lookup whose only action is not drawn yet, a person's chip, and "닫기". Expected values: the copy of
// board q6.
describe('where a Friend is (q6)', () => {
  it('shows 민수\'s chip with no ✕, the lines, and "닫기" alone, and draws his face', async () => {
    await ask('민수 어디야?');

    // The chip, and the strong word of the first line.
    expect(card().getAllByText('민수')).toHaveLength(2);
    expect(card().queryByRole('button', { name: '민수 빼기' })).toBeNull();
    expect(card().getByText('민수는 지금 302동이에요')).toBeVisible();
    expect(card().getByText('12:15까지 수업이에요')).toBeVisible();
    expect(card().queryByRole('button', { name: '길 안내' })).toBeNull();
    expect(card().queryByRole('button', { name: '만나고 싶다' })).toBeNull();
    expect(mapThings()).toContain('민수 · 지금 302동');
  });

  it('returns to the everyday map with "닫기"', async () => {
    const user = await ask('민수 어디야?');

    await user.press(card().getByRole('button', { name: '닫기' }));

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(mapThings()).not.toContain('민수 · 지금 302동');
  });
});
