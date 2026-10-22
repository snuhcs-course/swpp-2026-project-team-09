/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { pass, screen } from './support/app';
import { EXPLANATION, givePhone, ME, NEAR_LIBRARY, OFF_CAMPUS, ON_CAMPUS, openMain, placeOf } from './support/main';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const MY_POSITION = '내 위치로 이동';
const OFF_CAMPUS_WORDS = '캠퍼스 밖에 있어요';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the User's Avatar", () => {
  it("is at the phone's position on campus, and follows it", async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    const first = placeOf(ME);

    await phone.moveTo(NEAR_LIBRARY);

    // North-east of where it was.
    expect(placeOf(ME).left).toBeGreaterThan(first.left);
    expect(placeOf(ME).top).toBeLessThan(first.top);
    expect(screen.queryByText(EXPLANATION)).toBeNull();
  });

  it('is not shown off campus, and comes when the User walks in', async () => {
    const phone = givePhone({ permission: 'granted', position: OFF_CAMPUS });
    await openMain();
    expect(screen.queryByRole('image', { name: ME })).toBeNull();

    await phone.moveTo(ON_CAMPUS);
    expect(screen.getByRole('image', { name: ME })).toBeVisible();

    await phone.moveTo(OFF_CAMPUS);
    expect(screen.queryByRole('image', { name: ME })).toBeNull();
  });
});

describe('"내 위치로 이동"', () => {
  it('brings the map to the User, close, and keeps a camera that is closer', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: MY_POSITION }));

    // In the middle of the view of 750 by 1334 points, at its full size.
    expect(placeOf(ME).left).toBeCloseTo(375, 3);
    expect(placeOf(ME).top).toBeCloseTo(667, 3);
    expect(screen.getByRole('image', { name: ME })).toHaveProp('testID', 'me');

    await user.press(screen.getByRole('button', { name: '확대' }));
    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    await user.press(screen.getByRole('button', { name: '축소' }));
    // One step out of the closer zoom is still past the close level: the Avatar keeps its full size.
    expect(screen.getByRole('image', { name: ME })).toHaveProp('testID', 'me');
  });

  it('says off campus that the User is there, and shows the whole campus', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    await phone.moveTo(OFF_CAMPUS);

    await user.press(screen.getByRole('button', { name: MY_POSITION }));

    expect(screen.getByText(OFF_CAMPUS_WORDS)).toBeVisible();
    expect(screen.queryByText(EXPLANATION)).toBeNull();
    // Back on campus the Avatar is small again: the whole campus is in view.
    await phone.moveTo(ON_CAMPUS);
    expect(screen.getByRole('image', { name: ME })).toHaveProp('testID', 'me:small');
    await pass(2400);
    expect(screen.queryByText(OFF_CAMPUS_WORDS)).toBeNull();
  });
});

describe('the explanation before the location prompt', () => {
  it('appears when the screen opens to a User who was never asked, in the words of the spec', async () => {
    givePhone({ permission: 'unasked' });
    await openMain();

    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();
    expect(screen.getByText('지도에 내 아바타를 보여 주려면 위치 권한이 필요해요.')).toBeVisible();
    expect(screen.getByRole('button', { name: '나중에' })).toBeVisible();
    expect(screen.getByRole('button', { name: '계속' })).toBeVisible();
  });

  it('leads to the system\'s prompt on "계속", and to the Avatar when the User allows it', async () => {
    const phone = givePhone({ permission: 'unasked', prompt: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    expect(phone.prompts()).toBe(0);

    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(100);

    expect(phone.prompts()).toBe(1);
    expect(screen.queryByText(EXPLANATION)).toBeNull();
    expect(screen.getByRole('image', { name: ME })).toBeVisible();
  });

  it('leaves the map without an Avatar on "나중에", and asks the phone nothing', async () => {
    const phone = givePhone({ permission: 'unasked', prompt: 'granted', position: ON_CAMPUS });
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: '나중에' }));
    await pass(100);

    expect(phone.prompts()).toBe(0);
    expect(screen.queryByText(EXPLANATION)).toBeNull();
    expect(screen.queryByRole('image', { name: ME })).toBeNull();
    expect(screen.getByText('지도는 Android·iOS 빌드에서 보입니다')).toBeVisible();
  });
});

describe('a User without the location permission', () => {
  it("has the map without an Avatar after refusing the system's prompt", async () => {
    const phone = givePhone({ permission: 'unasked', prompt: 'refused', position: ON_CAMPUS });
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(100);

    expect(phone.prompts()).toBe(1);
    expect(screen.queryByText(EXPLANATION)).toBeNull();
    expect(screen.queryByRole('image', { name: ME })).toBeNull();
  });

  it('sees the explanation again on "내 위치로 이동", after "나중에" and after a refusal', async () => {
    givePhone({ permission: 'unasked' });
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: '나중에' }));

    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();

    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(100);
    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();
  });

  it('is not asked when the screen opens after an earlier refusal', async () => {
    const phone = givePhone({ permission: 'refused', prompt: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    expect(screen.queryByText(EXPLANATION)).toBeNull();

    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(100);

    expect(phone.prompts()).toBe(1);
    expect(screen.getByRole('image', { name: ME })).toBeVisible();
  });
});
