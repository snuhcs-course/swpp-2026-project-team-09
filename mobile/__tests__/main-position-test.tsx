// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by AhnJinYoung
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { pass, screen } from './support/app';
import { EXPLANATION, givePhone, ME, NEAR_LIBRARY, ON_CAMPUS, openMain, placeOf } from './support/main';
import { startFresh } from './support/mocks';
import { PositionProvider, usePosition } from '@/position';
import { readKept } from '@/storage/kept';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const MY_POSITION = '내 위치로 이동';
const FINDING = '위치를 찾는 중이에요';
const BLOCKED = '휴대폰 설정에서 이 앱의 위치 권한이 꺼져 있어요. 설정에서 켜면 지도에 내 아바타가 보여요.';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a User whom the system no longer asks for the location', () => {
  it("is led to the phone's settings by the explanation, and has the Avatar after allowing it there", async () => {
    const phone = givePhone({ permission: 'blocked', position: ON_CAMPUS });
    const user = await openMain();
    expect(screen.queryByText(EXPLANATION)).toBeNull();

    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    expect(screen.getByText(BLOCKED)).toBeVisible();
    expect(screen.getByRole('button', { name: '나중에' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '계속' })).toBeNull();

    await user.press(screen.getByRole('button', { name: '설정 열기' }));
    expect(phone.settingsOpened()).toBe(1);
    expect(phone.prompts()).toBe(0);
    expect(screen.queryByText(EXPLANATION)).toBeNull();

    phone.setPermission('granted');
    await phone.comeToFront();
    expect(screen.getByRole('image', { name: ME })).toBeVisible();
  });

  it("sees the way to the settings after a refusal that ends the system's prompts", async () => {
    const phone = givePhone({ permission: 'unasked', prompt: 'blocked' });
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(100);

    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    expect(screen.getByText(BLOCKED)).toBeVisible();
    await user.press(screen.getByRole('button', { name: '나중에' }));

    expect(phone.settingsOpened()).toBe(0);
    expect(screen.queryByText(EXPLANATION)).toBeNull();
  });
});

describe('the explanation before the location prompt, once answered', () => {
  it('is remembered on the phone and does not appear by itself again', async () => {
    givePhone({ permission: 'unasked' });
    const user = await openMain();
    expect((await readKept()).locationExplained).toBe(false);

    await user.press(screen.getByRole('button', { name: '나중에' }));
    await pass(100);

    expect((await readKept()).locationExplained).toBe(true);
  });

  it('stays away when the screen opens again, and still comes on "내 위치로 이동"', async () => {
    givePhone({ permission: 'unasked' });
    const user = await openMain({ locationExplained: true });
    expect(screen.queryByText(EXPLANATION)).toBeNull();

    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();
    expect(screen.getByRole('button', { name: '계속' })).toBeVisible();
  });
});

describe("a phone whose location services are off, with the User's permission", () => {
  it('says that the position is being looked for, and tries again on the press', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS, servicesOff: true });
    const user = await openMain();
    expect(phone.watches()).toBe(1);
    expect(screen.queryByRole('image', { name: ME })).toBeNull();

    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    expect(screen.getByText(FINDING)).toBeVisible();
    expect(phone.watches()).toBe(2);

    phone.turnServicesOn();
    await user.press(screen.getByRole('button', { name: MY_POSITION }));
    expect(phone.watches()).toBe(3);
    expect(screen.getByRole('image', { name: ME })).toBeVisible();
  });

  it('tries again when the app returns to the front, and not while the watch works', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS, servicesOff: true });
    await openMain();

    phone.turnServicesOn();
    await phone.comeToFront();
    expect(phone.watches()).toBe(2);
    expect(screen.getByRole('image', { name: ME })).toBeVisible();

    await phone.comeToFront();
    expect(phone.watches()).toBe(2);
  });
});

describe("the phone's first position", () => {
  it('is the last one the phone knows, until it measures one', async () => {
    const phone = givePhone({ permission: 'granted', lastKnown: ON_CAMPUS });
    await openMain();
    const first = placeOf(ME);

    await phone.moveTo(NEAR_LIBRARY);
    expect(placeOf(ME)).not.toEqual(first);
  });

  it('is waited for with a toast when the phone knows none', async () => {
    givePhone({ permission: 'granted' });
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: MY_POSITION }));

    expect(screen.getByText(FINDING)).toBeVisible();
    expect(screen.queryByText(EXPLANATION)).toBeNull();
  });
});

function Reader({ name }: { name: string }): ReactElement {
  const { permission, position } = usePosition();
  return <Text>{`${name}: ${permission} ${position === null ? '없음' : position.latitude}`}</Text>;
}

describe('the position read by several parts of a screen', () => {
  it('is one permission and one watch of the phone', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    await render(
      <PositionProvider>
        <Reader name="지도" />
        <Reader name="경로" />
      </PositionProvider>,
    );
    await pass(100);

    expect(screen.getByText(`지도: granted ${ON_CAMPUS.latitude}`)).toBeVisible();
    expect(screen.getByText(`경로: granted ${ON_CAMPUS.latitude}`)).toBeVisible();
    expect(phone.watches()).toBe(1);
    await phone.moveTo(NEAR_LIBRARY);
    expect(screen.getByText(`경로: granted ${NEAR_LIBRARY.latitude}`)).toBeVisible();
  });
});
