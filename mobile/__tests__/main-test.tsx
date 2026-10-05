import { pass, screen } from './support/app';
import { givePhone, ME, ON_CAMPUS, openMain, placeOf } from './support/main';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const NOT_READY = '준비 중이에요';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the main screen', () => {
  it('shows the map on the whole campus, with its credit', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();

    expect(screen.getByText('지도는 Android 빌드에서 보입니다')).toBeVisible();
    expect(screen.getByText('© OpenStreetMap · 국토지리정보원')).toBeVisible();
    // The User's Avatar is at three quarters of its size while the whole campus is in view.
    expect(screen.getByRole('button', { name: ME })).toHaveProp('testID', 'me:small');
  });

  it('has the zoom control over the map', async () => {
    givePhone({ permission: 'granted' });
    await openMain();

    expect(screen.getByRole('button', { name: '확대' })).toBeVisible();
    expect(screen.getByRole('button', { name: '축소' })).toBeVisible();
    expect(screen.getByRole('button', { name: '내 위치로 이동' })).toBeVisible();
  });
});

describe("the main screen's bottom navigation", () => {
  it('has the five slots, with 지도 as the current one', async () => {
    givePhone({ permission: 'granted' });
    await openMain();

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('tab', { name: /^파티/u })).not.toBeSelected();
    expect(screen.getByRole('button', { name: '올리기' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '행사' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '내 정보' })).toBeVisible();
  });

  it('counts on 파티 what waits for the User in Parties', async () => {
    givePhone({ permission: 'granted' });
    await openMain();

    expect(screen.getByRole('tab', { name: '파티, 새 소식 3개' })).toBeVisible();
  });

  it('shows no count when the number cannot be read', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'getPartyNews';
    givePhone({ permission: 'granted' });
    await openMain();
    await pass(3000);

    expect(screen.getByRole('tab', { name: '파티' })).toBeVisible();
  });
});

describe("a slot of the main screen's bottom navigation", () => {
  it.each([
    ['tab', '파티, 새 소식 3개'],
    ['button', '올리기'],
    ['tab', '행사'],
    ['tab', '내 정보'],
  ] as const)('says that a %s, %s, is not ready', async (role, name) => {
    givePhone({ permission: 'granted' });
    const user = await openMain();

    await user.press(screen.getByRole(role, { name }));

    expect(screen.getByText(NOT_READY)).toBeVisible();
    await pass(2400);
    expect(screen.queryByText(NOT_READY)).toBeNull();
  });

  it('says nothing for 지도, where the User is', async () => {
    givePhone({ permission: 'granted' });
    const user = await openMain();

    await user.press(screen.getByRole('tab', { name: '지도' }));

    expect(screen.queryByText(NOT_READY)).toBeNull();
  });
});

describe('the zoom buttons', () => {
  it('zoom in and out by a factor 1.5 around the middle of the view', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    const far = placeOf(ME);
    const middle = 750 / 2;

    await user.press(screen.getByRole('button', { name: '확대' }));
    const closer = placeOf(ME);
    expect(closer.left - middle).toBeCloseTo((far.left - middle) * 1.5, 3);
    // One press is short of the level from which the Avatar has its full size, and two are past it.
    expect(screen.getByRole('button', { name: ME })).toHaveProp('testID', 'me:small');
    await user.press(screen.getByRole('button', { name: '확대' }));
    expect(screen.getByRole('button', { name: ME })).toHaveProp('testID', 'me');

    await user.press(screen.getByRole('button', { name: '축소' }));
    expect(placeOf(ME).left).toBeCloseTo(closer.left, 3);
    expect(screen.getByRole('button', { name: ME })).toHaveProp('testID', 'me:small');
  });

  it('do not zoom out further than the whole campus', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    const far = placeOf(ME);

    await user.press(screen.getByRole('button', { name: '축소' }));
    expect(placeOf(ME)).toEqual(far);

    // The press that did nothing is not counted: one press of zoom in is still one step.
    await user.press(screen.getByRole('button', { name: '확대' }));
    expect(placeOf(ME).left - 375).toBeCloseTo((far.left - 375) * 1.5, 3);
  });
});
