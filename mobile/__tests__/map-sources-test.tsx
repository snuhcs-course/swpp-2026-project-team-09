import { Linking } from 'react-native';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';

// The screen of the map data's sources, opened from the map's credit, against the mocks.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openSources(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await press(user, '지도 데이터 출처 보기');
  await pass(500);
  return user;
}

describe('the sources of the map data', () => {
  it("opens from the map's credit, which stays written on the map", async () => {
    await openSources();

    expect(shownAddress()).toBe('/map-sources');
    expect(screen.getByRole('header', { name: '지도 데이터 출처' })).toBeVisible();
    expect(screen.getByRole('button', { name: '뒤로' })).toBeVisible();
    expect(screen.getByText('© OpenStreetMap · 국토지리정보원', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('credits OpenStreetMap and 국토지리정보원', async () => {
    await openSources();

    expect(screen.getByRole('header', { name: 'OpenStreetMap' })).toBeVisible();
    expect(screen.getByText('© OpenStreetMap contributors')).toBeVisible();
    expect(
      screen.getByText('캠퍼스 경계, 셔틀버스 노선과 건물 윤곽에 쓰여요. ODbL 라이선스로 제공돼요.'),
    ).toBeVisible();
    expect(screen.getByRole('header', { name: '국토지리정보원' })).toBeVisible();
    expect(screen.getByText('국토지리정보원, 연속수치지형도 건물 (2026), 공공누리 제1유형')).toBeVisible();
    expect(
      screen.getByText('건물 윤곽에 쓰여요. 출처를 밝히면 자유롭게 이용할 수 있는 공공저작물이에요.'),
    ).toBeVisible();
  });

  it.each([
    ['저작권과 라이선스 보기', 'https://www.openstreetmap.org/copyright'],
    ['브이월드에서 내려받기', 'https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30162'],
  ])('opens %s in the browser', async (link, url) => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const user = await openSources();

    await user.press(screen.getByRole('link', { name: link }));

    expect(openURL).toHaveBeenCalledWith(url);
  });
});
