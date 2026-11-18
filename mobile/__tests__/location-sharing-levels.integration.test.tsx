/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND } from './support/markers';
import { startFresh } from './support/mocks';
import { apiClient } from '@/api/client';

// A Friend's level on the 위치 공유 screen against the mocks: the Friend's Avatar on the map follows it, and a change
// that fails turns back.

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
  // The levels take a press only while the Master Switch is on, which the mocks start with off.
  const turned = apiClient.setMasterSwitch(true);
  await pass(300);
  await turned;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openSharing(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await act(() => {
    router.push('/me/location-sharing');
  });
  await pass(500);
  return user;
}

// 김민준's choice of the level named.
function choice(words: string): ReturnType<typeof screen.getByRole> {
  return within(screen.getByLabelText('김민준님에게 보일 위치')).getByRole('radio', { name: words });
}

describe("A Friend's level on 위치 공유", () => {
  it("offers three levels, and the Friend's Avatar goes at 시간표만 and comes back above it", async () => {
    const user = await openSharing();
    expect(choice('시간표만')).not.toBeChecked();
    expect(choice('지금 있는 건물')).not.toBeChecked();
    expect(choice('정확한 위치')).toBeChecked();

    await user.press(choice('시간표만'));
    await user.press(screen.getByRole('button', { name: '위치 끄기' }));
    expect(choice('시간표만')).toBeChecked();
    await pass(1000);
    expect(screen.getByLabelText('김민준, 서로 시간표만 보여요')).toBeVisible();
    // The map lies under this screen.
    expect(screen.queryByRole('button', { name: FRIEND, hidden: true })).toBeNull();

    await user.press(choice('지금 있는 건물'));
    await pass(1000);
    expect(choice('지금 있는 건물')).toBeChecked();
    expect(choice('정확한 위치')).not.toBeChecked();
    expect(screen.getByRole('button', { name: FRIEND, hidden: true })).toBeTruthy();
  });

  it('turns the choice back and says so when the change fails', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'setFriendLevel';
    const user = await openSharing();

    await user.press(choice('시간표만'));
    await user.press(screen.getByRole('button', { name: '위치 끄기' }));
    await pass(1000);

    expect(choice('정확한 위치')).toBeChecked();
    expect(screen.getByText('위치 공유를 바꾸지 못했어요')).toBeVisible();
  });
});
