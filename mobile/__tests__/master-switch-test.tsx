import { fireEvent } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain, type Phone } from './support/main';
import { startFresh } from './support/mocks';
import { apiClient } from '@/api/client';

// The switch "친구와 위치 공유" on 내 정보, which is the Master Switch, against the mocks, which keep it in memory and
// start with it off.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SWITCH = '친구와 위치 공유';
const EXPLANATION = '내 위치를 지도에 표시할까요?';
const NEEDS_PERMISSION = '위치 권한을 허용해야 공유할 수 있어요';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// 내 정보, for a User who answered the map's explanation before.
async function openMe(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain({ locationExplained: true });
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function turn(on: boolean): Promise<void> {
  await fireEvent(screen.getByRole('switch', { name: SWITCH }), 'valueChange', on);
  // The cache tells the screen on the next turn of the timers.
  await pass(0);
}

async function lobbySwitch(): Promise<boolean> {
  const asked = apiClient.enterLobby();
  await pass(300);
  return (await asked).masterSwitch;
}

describe('the Master Switch with the permission granted', () => {
  beforeEach(() => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
  });

  it('turns on at once, and the main server keeps it', async () => {
    await openMe();

    await turn(true);

    expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
    await pass(300);
    expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
    expect(await lobbySwitch()).toBe(true);
  });

  it('turns off again', async () => {
    await openMe();
    await turn(true);
    await pass(300);

    await turn(false);
    await pass(300);

    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
    expect(await lobbySwitch()).toBe(false);
  });

  it('turns back with a toast when the change fails', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'setMasterSwitch';
    await openMe();

    await turn(true);
    expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
    await pass(400);

    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
    expect(screen.getByTestId('toast-layer')).toHaveTextContent('위치 공유를 바꾸지 못했어요');
  });
});

let phone: Phone;

describe('the Master Switch without the permission', () => {
  it('explains, asks the system, and turns on once the User allows it', async () => {
    phone = givePhone({ permission: 'unasked', prompt: 'granted', position: ON_CAMPUS });
    const user = await openMe();

    await turn(true);
    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
    expect(screen.getByRole('header', { name: EXPLANATION })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(0);

    expect(phone.prompts()).toBe(1);
    expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
  });

  it('stays off with a toast when the User refuses the system', async () => {
    phone = givePhone({ permission: 'unasked', prompt: 'refused' });
    const user = await openMe();

    await turn(true);
    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(0);

    expect(phone.prompts()).toBe(1);
    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
    expect(screen.getByTestId('toast-layer')).toHaveTextContent(NEEDS_PERMISSION);
  });
});

describe('the Master Switch with the permission refused before', () => {
  it('stays off with a toast when the User answers the explanation with 나중에', async () => {
    phone = givePhone({ permission: 'refused' });
    const user = await openMe();

    await turn(true);
    await user.press(screen.getByRole('button', { name: '나중에' }));

    expect(phone.prompts()).toBe(0);
    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
    expect(screen.getByTestId('toast-layer')).toHaveTextContent(NEEDS_PERMISSION);
  });

  it("leads to the phone's settings when the system no longer asks, and stays off", async () => {
    phone = givePhone({ permission: 'blocked' });
    const user = await openMe();

    await turn(true);
    await user.press(screen.getByRole('button', { name: '설정 열기' }));

    expect(phone.prompts()).toBe(0);
    expect(phone.settingsOpened()).toBe(1);
    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
  });
});
