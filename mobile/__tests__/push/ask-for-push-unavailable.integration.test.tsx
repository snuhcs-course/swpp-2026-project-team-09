/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Platform } from 'react-native';
import type * as PushDevice from '@/push/device';
import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import type * as PushFake from '../support/push';
import { pass, screen } from '../support/app';
import type { FakeServer } from '../support/fake-server';
import { givePhone, ON_CAMPUS, openMain } from '../support/main';
import { startFresh } from '../support/mocks';
import { MY_HIKE } from '../support/party';
import { givePushPhone, type PushPhone } from '../support/push';
import { sendParty, startServerBuild } from '../support/push-moments';
import { MIN_JUN_HOLDER } from '../support/room';
import { PHONE_NOW } from '../support/server';

// The sheet that asks about push in builds that cannot push, against the fake main server: the real push wrapper over
// a mocked `expo-notifications`.

jest.mock('expo-location');
jest.mock('expo-image-picker');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('../support/fake-socket'));
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));
jest.mock('expo', () => jest.requireActual<typeof PushFake>('../support/push').expoModule);
jest.mock('expo-notifications', () => jest.requireActual<typeof PushFake>('../support/push').notificationsModule);

const QUESTION = '나설 시각을 휴대폰으로 알려 드릴까요?';

let server: FakeServer;
let phone: PushPhone;

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function sheetShown(): boolean {
  return screen.queryByRole('header', { name: QUESTION }) !== null;
}

async function startUndetermined(): Promise<void> {
  server = await startServerBuild();
  phone = givePushPhone({ permission: 'undetermined' });
}

describe('a build that cannot push', () => {
  it('shows no sheet and reads no permission without the native module', async () => {
    await startUndetermined();
    phone = givePushPhone({ native: false, permission: 'undetermined' });
    const user = await openMain();

    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`)).toHaveLength(1);
    expect(sheetShown()).toBe(false);
    expect(phone.permissionReads()).toBe(0);
  });

  it('shows no sheet and reads no permission on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await startUndetermined();
    const user = await openMain();

    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`)).toHaveLength(1);
    expect(sheetShown()).toBe(false);
    expect(phone.permissionReads()).toBe(0);
  });

  it('never reads the permission nor shows the sheet in a mock build', async () => {
    jest.useFakeTimers({ now: PHONE_NOW });
    await startFresh();
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    phone = givePushPhone({ permission: 'undetermined' });
    const user = await openMain();

    await sendParty(user, [MIN_JUN_HOLDER.name]);
    await pass(1000);

    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    expect(sheetShown()).toBe(false);
    expect(phone.permissionReads()).toBe(0);
  });
});
