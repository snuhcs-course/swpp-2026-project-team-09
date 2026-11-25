/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';
import { keepMapLayers, readMapLayers } from '@/storage/map-layers';

// The map's layers the phone keeps are each signed-in User's own (P06 ticket 03).

jest.mock('@/auth/sign-in', () => ({ myUserId: jest.fn<string, []>() }));

const ALL_OFF = { dining: false, shuttle: false, study: false };
const STUDY_AND_SHUTTLE = { dining: false, shuttle: true, study: true };
const DINING = { dining: true, shuttle: false, study: false };

function signedInAs(userId: string): void {
  jest.mocked(myUserId).mockReturnValue(userId);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('two Users on one phone', () => {
  it('each get their own layers, all off with nothing kept', async () => {
    signedInAs('user-a');
    await keepMapLayers(STUDY_AND_SHUTTLE);
    signedInAs('user-b');
    expect(await readMapLayers()).toEqual(ALL_OFF);
    await keepMapLayers(DINING);

    signedInAs('user-a');
    expect(await readMapLayers()).toEqual(STUDY_AND_SHUTTLE);
    signedInAs('user-b');
    expect(await readMapLayers()).toEqual(DINING);
  });
});

describe('the layers the phone keeps', () => {
  it('are read and kept for nobody without a signed-in User', async () => {
    signedInAs('');
    await keepMapLayers(STUDY_AND_SHUTTLE);

    expect(await readMapLayers()).toEqual(ALL_OFF);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('are the last of two changes made at once', async () => {
    signedInAs('user-a');

    await Promise.all([keepMapLayers(STUDY_AND_SHUTTLE), keepMapLayers(DINING)]);

    expect(await readMapLayers()).toEqual(DINING);
  });

  it('count as all off when the phone cannot read them', async () => {
    signedInAs('user-a');
    await keepMapLayers(STUDY_AND_SHUTTLE);
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('No storage'));

    expect(await readMapLayers()).toEqual(ALL_OFF);
  });

  it('count as all off when this version cannot read what was kept', async () => {
    signedInAs('user-a');
    await AsyncStorage.setItem('snunow.map-layers:user-a', 'on');

    expect(await readMapLayers()).toEqual(ALL_OFF);
  });
});
