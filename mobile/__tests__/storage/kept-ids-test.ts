/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';
import { hidePost, listHiddenPosts } from '@/api/quest-parts/hidden-posts';
import { askCompanionSeeker, listCompanionSeekers } from '@/api/quest-parts/seekers';

// What the phone keeps of 찾기's mocked parts is each signed-in User's own (P06 ticket 03).

jest.mock('@/auth/sign-in', () => ({ myUserId: jest.fn<string, []>() }));

function signedInAs(userId: string): void {
  jest.mocked(myUserId).mockReturnValue(userId);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('two Users on one phone', () => {
  it('keeps the posts each hid apart', async () => {
    signedInAs('user-a');
    await hidePost('q1');
    signedInAs('user-b');
    expect(await listHiddenPosts()).toEqual([]);
    await hidePost('q2');

    signedInAs('user-a');
    expect(await listHiddenPosts()).toEqual(['q1']);
    signedInAs('user-b');
    expect(await listHiddenPosts()).toEqual(['q2']);
  });

  it('keeps the people each asked apart', async () => {
    signedInAs('user-a');
    await askCompanionSeeker('seeker-jazz');
    signedInAs('user-b');

    const seekers = await listCompanionSeekers('mock');

    expect(seekers.filter(({ asked }) => asked)).toEqual([]);
  });

  it('reads and keeps nothing without a signed-in User', async () => {
    signedInAs('');
    await hidePost('q1');

    expect(await listHiddenPosts()).toEqual([]);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
