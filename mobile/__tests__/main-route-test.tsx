// AI-generated with Claude Opus 5.5, 2026-10-06 to 2026-10-09, prompted by AhnJinYoung and Jaehyun0320, reviewed by fyoon46 in #74
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass, screen } from './support/app';
import { EXPLANATION, givePhone, NEAR_LIBRARY, OFF_CAMPUS, ON_CAMPUS, openMain } from './support/main';
import { DINNER, FRIEND, lookOf, press, ROUTE, wordsUnder } from './support/markers';
import { startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { QUESTS } from '@/api/mock/data/quests';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// Where the mock's Quests are: the class 자료구조, the dinner and the Quest of the AI event.
const CLASS = { latitude: 37.45016, longitude: 126.95259 };
const DINNER_PLACE = { latitude: 37.45907, longitude: 126.95023 };
const AI_QUEST_PLACE = { latitude: 37.45091, longitude: 126.95289 };
const AI_QUEST = '파티 · AI 커리어 설명회';
const GUIDING = '저녁 약속까지 길 안내';

let findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');

beforeEach(async () => {
  jest.useFakeTimers();
  findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
  await startFresh();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the route drawn when the main screen opens', () => {
  it("goes from the User's position on campus to the next Quest by time, as the frame's dashed line", async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    await pass(500);

    expect(findWalkingRoute).toHaveBeenCalledWith(ON_CAMPUS, CLASS);
    expect(screen.getByLabelText(ROUTE)).toBeVisible();
    const dashes = screen.getAllByTestId('route-stroke');
    expect(dashes.length).toBeGreaterThan(12);
    // A dash of 2 with round ends, 3 wide, in the Quest's colour.
    expect(dashes[0]).toHaveStyle({ width: 5, height: 3, backgroundColor: '#865600' });
    expect(screen.queryByText(/길 안내/u)).toBeNull();
  });

  it('is drawn once: a new position asks for no other', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    await pass(500);

    await phone.moveTo(NEAR_LIBRARY);
    await pass(500);

    expect(findWalkingRoute).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(ROUTE)).toBeVisible();
  });

  it('comes when the position comes', async () => {
    const phone = givePhone({ permission: 'granted' });
    await openMain();
    await pass(500);
    expect(screen.queryByLabelText(ROUTE)).toBeNull();

    await phone.moveTo(ON_CAMPUS);
    await pass(500);

    expect(screen.getByLabelText(ROUTE)).toBeVisible();
  });
});

describe('the route when the main screen opens without a position on campus', () => {
  it.each([
    ['off campus', { permission: 'granted', position: OFF_CAMPUS }],
    ['without the permission', { permission: 'refused' }],
  ] as const)('is not drawn %s', async (_where, phone) => {
    givePhone(phone);
    await openMain({ locationExplained: true });
    await pass(500);

    expect(findWalkingRoute).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(ROUTE)).toBeNull();
  });
});

describe('a Quest whose place is words alone', () => {
  it('shows its words in the Quest list, has no marker on the map and no route', async () => {
    const dinner = QUESTS.find(({ id }) => id === 'q-dinner');
    const [step] = dinner?.subQuests ?? [];
    if (dinner === undefined || step === undefined) {
      throw new Error('No dinner in the mock');
    }
    const station = { placeId: null, label: '서울대입구역', latitude: null, longitude: null };
    jest.spyOn(apiClient, 'listQuests').mockResolvedValue([{ ...dinner, subQuests: [{ ...step, place: station }] }]);
    givePhone({ permission: 'granted', position: ON_CAMPUS });

    await openMain();
    await pass(500);

    expect(screen.getByRole('button', { name: /저녁 약속 · 20:10 · 서울대입구역$/u })).toBeVisible();
    expect(screen.queryByRole('button', { name: DINNER })).toBeNull();
    expect(findWalkingRoute).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(ROUTE)).toBeNull();
  });
});

describe('"길찾기"', () => {
  it('closes the card, draws the way from the User to the place, shows both ends and says where it leads', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    await press(user, DINNER);

    await press(user, '길찾기');

    expect(screen.queryByTestId('map-card')).toBeNull();
    expect(screen.getByText(GUIDING)).toBeVisible();
    expect(findWalkingRoute).toHaveBeenLastCalledWith(ON_CAMPUS, DINNER_PLACE);
    await pass(500);
    expect(screen.getAllByLabelText(ROUTE)).toHaveLength(1);
    // The two ends are a few steps apart: the map came to the "pins" level, as the frame does, and no closer.
    expect(lookOf(DINNER)).toBe('party:pin');
    expect(wordsUnder(DINNER, '저녁 약속')).toBeNull();
    expect(screen.getByRole('button', { name: '확대' })).toBeVisible();
    await pass(2400);
    expect(screen.queryByText(GUIDING)).toBeNull();
  });

  it('replaces the line that is drawn: one route at a time', async () => {
    // Without a Party, the Quest of the AI event is a Shared Quest too, with its own "길찾기".
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty,listParties';
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    await press(user, DINNER);
    await press(user, '길찾기');
    await pass(500);

    await press(user, AI_QUEST);
    await press(user, '길찾기');
    await pass(500);

    expect(screen.getByText('AI 커리어 설명회까지 길 안내')).toBeVisible();
    expect(findWalkingRoute.mock.calls.map(([, to]) => to)).toEqual([CLASS, DINNER_PLACE, AI_QUEST_PLACE]);
    expect(screen.getAllByLabelText(ROUTE)).toHaveLength(1);
  });
});

describe('a "길찾기" that finds no way', () => {
  it('says so', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    await pass(500);
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'findWalkingRoute';
    await press(user, DINNER);

    await press(user, '길찾기');
    await pass(3000);

    expect(screen.getByText('길을 찾지 못했어요')).toBeVisible();
    expect(screen.queryByLabelText(ROUTE)).toBeNull();
  });
});

describe('"길찾기" without a position to start from', () => {
  it('brings the map to the place and says that the User is off campus', async () => {
    givePhone({ permission: 'granted', position: OFF_CAMPUS });
    const user = await openMain();
    await press(user, DINNER);

    await press(user, '길찾기');

    expect(screen.getByText('캠퍼스 밖에 있어요')).toBeVisible();
    expect(findWalkingRoute).not.toHaveBeenCalled();
    // Closer than the whole campus, and the card is still there to try again.
    expect(lookOf(FRIEND)).toBe('person:full:free:f1');
    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
  });

  it('shows the explanation before the location prompt when the permission is missing', async () => {
    givePhone({ permission: 'refused' });
    const user = await openMain({ locationExplained: true });
    await press(user, DINNER);
    expect(screen.queryByText(EXPLANATION)).toBeNull();

    await press(user, '길찾기');

    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();
    expect(findWalkingRoute).not.toHaveBeenCalled();
    expect(lookOf(FRIEND)).toBe('person:small:free:f1');
  });

  it('says that the position is being looked for when the phone has told none yet', async () => {
    const phone = givePhone({ permission: 'granted' });
    const user = await openMain();
    await press(user, DINNER);

    await press(user, '길찾기');

    expect(screen.getByText('위치를 찾는 중이에요')).toBeVisible();
    expect(findWalkingRoute).not.toHaveBeenCalled();

    // The position comes: neither the way that was asked nor the opening route to another place is drawn.
    await phone.moveTo(ON_CAMPUS);
    await pass(500);
    expect(findWalkingRoute).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(ROUTE)).toBeNull();
  });
});

describe('leaving the main screen', () => {
  it('drops the route', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    await pass(500);
    expect(screen.getByLabelText(ROUTE)).toBeVisible();

    await act(() => {
      router.push('/legal/terms');
    });
    await pass(500);
    await act(() => {
      router.back();
    });
    await pass(500);

    expect(screen.queryByLabelText(ROUTE)).toBeNull();
    expect(findWalkingRoute).toHaveBeenCalledTimes(1);
  });
});

describe('leaving the main screen before the opening route is drawn', () => {
  it('drops it: a position that comes later, away or back on the screen, draws none', async () => {
    const phone = givePhone({ permission: 'granted' });
    await openMain();
    await pass(500);

    await act(() => {
      router.push('/legal/terms');
    });
    await pass(500);
    await phone.moveTo(ON_CAMPUS);
    await pass(500);
    await act(() => {
      router.back();
    });
    await pass(500);
    await phone.moveTo(NEAR_LIBRARY);
    await pass(500);

    expect(findWalkingRoute).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(ROUTE)).toBeNull();
  });
});
