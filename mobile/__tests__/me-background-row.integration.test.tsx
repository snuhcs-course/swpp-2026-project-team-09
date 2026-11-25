/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { answered, startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { keep, readKept } from '@/storage/kept';

// The row 백그라운드에서도 공유 on 내 정보's 위치 공유 card under the Master Switch (P06 ticket 08), against the mocks:
// on Android in a development build, with the background permission granted. The native switch's `on` is what a
// screen reader reads.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

type User = Awaited<ReturnType<typeof openMain>>;

const ROW = '백그라운드에서도 공유';
const MASTER = '위치 공유';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.mocked(Location.isBackgroundLocationAvailableAsync).mockResolvedValue(true);
  jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
    status: Location.PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: true,
    expires: 'never',
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// 내 정보 with the Master Switch on and the User's choice kept on the phone. The mocks start with the Master Switch off
// and the question before its first turn-off not asked.
async function openMe(chosen: boolean, { offAsked = true } = {}): Promise<User> {
  await keep({ backgroundChosen: chosen });
  if (offAsked) {
    await answered(apiClient.recordMasterOffAsked());
  }
  const turned = apiClient.setMasterSwitch(true);
  await pass(300);
  await turned;
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function turnMaster(on: boolean): Promise<void> {
  await fireEvent(screen.getByLabelText(MASTER), 'valueChange', on);
  await pass(500);
}

describe('the row 백그라운드에서도 공유', () => {
  it('shows off and disabled while 위치 공유 is off, and the choice kept on the phone stays', async () => {
    await openMe(true);
    expect(screen.getByLabelText(ROW)).toHaveProp('on', true);
    expect(screen.getByLabelText(ROW)).toBeEnabled();

    await turnMaster(false);

    expect(screen.getByLabelText(ROW)).toHaveProp('on', false);
    expect(screen.getByLabelText(ROW)).toBeDisabled();
    expect((await readKept()).backgroundChosen).toBe(true);
  });

  it.each([
    ['on', true],
    ['off', false],
  ])('comes back %s when 위치 공유 is turned on again, as the User chose it', async (_, chosen) => {
    await openMe(chosen);
    await turnMaster(false);

    await turnMaster(true);

    expect(screen.getByLabelText(ROW)).toHaveProp('on', chosen);
    expect(screen.getByLabelText(ROW)).toBeEnabled();
    expect((await readKept()).backgroundChosen).toBe(chosen);
  });

  it('stays on while the first turn-off asks, and after 건물까지만, which leaves 위치 공유 on', async () => {
    const user = await openMe(true, { offAsked: false });

    await turnMaster(false);
    expect(screen.getByRole('button', { name: '건물까지만' })).toBeVisible();
    expect(screen.getByLabelText(ROW)).toHaveProp('on', true);
    await user.press(screen.getByRole('button', { name: '건물까지만' }));
    await pass(500);

    expect(screen.getByLabelText(MASTER)).toHaveProp('on', true);
    expect(screen.getByLabelText(ROW)).toHaveProp('on', true);
    expect(screen.getByLabelText(ROW)).toBeEnabled();
  });
});
