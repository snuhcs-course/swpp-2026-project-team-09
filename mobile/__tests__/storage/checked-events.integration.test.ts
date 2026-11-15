/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';
import { keepChecked, readCheckedEvents } from '@/storage/checked-events';

// The New Events a User checked are kept on the phone for each signed-in User, and each goes once its event was
// published 24 hours ago (P06 ticket 02).

jest.mock('@/auth/sign-in', () => ({ myUserId: jest.fn<string, []>() }));

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-06T13:00:00+09:00');
const AN_HOUR_AGO = '2026-10-06T12:00:00+09:00';

function signedInAs(userId: string): void {
  jest.mocked(myUserId).mockReturnValue(userId);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the checked New Events', () => {
  it("are each User's own on one phone", async () => {
    signedInAs('user-a');
    await keepChecked('e1', AN_HOUR_AGO, NOW, DAY);
    signedInAs('user-b');
    expect(await readCheckedEvents(NOW, DAY)).toEqual({});
    await keepChecked('e2', AN_HOUR_AGO, NOW, DAY);

    signedInAs('user-a');
    expect(await readCheckedEvents(NOW, DAY)).toEqual({ e1: AN_HOUR_AGO });
  });

  it('drop an event published 24 hours ago, when read and when another is kept', async () => {
    signedInAs('user-a');
    await keepChecked('e1', '2026-10-05T14:00:00+09:00', NOW, DAY);
    const aDayLater = new Date('2026-10-06T14:00:00+09:00');

    expect(await readCheckedEvents(aDayLater, DAY)).toEqual({});

    await keepChecked('e2', AN_HOUR_AGO, aDayLater, DAY);
    expect(JSON.parse((await AsyncStorage.getItem('snunow.checked-events:user-a')) ?? 'null')).toEqual({
      e2: AN_HOUR_AGO,
    });
  });

  it('are read as none when what is kept cannot be read, and nothing is kept without a signed-in User', async () => {
    signedInAs('user-a');
    await AsyncStorage.setItem('snunow.checked-events:user-a', '["e1"]');
    expect(await readCheckedEvents(NOW, DAY)).toEqual({});

    signedInAs('');
    await keepChecked('e1', AN_HOUR_AGO, NOW, DAY);
    expect(await AsyncStorage.getAllKeys()).toEqual(['snunow.checked-events:user-a']);
  });
});
