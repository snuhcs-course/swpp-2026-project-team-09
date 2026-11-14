/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { keep, readKept } from '@/storage/kept';

// The switch of the answer on the map as the phone keeps it (P02 ticket 01): off unless it was kept on.

const KEY = 'snunow.kept';

// What a version of the app before the switch kept: a signed-in User who finished Onboarding.
const OLDER = {
  signedIn: true,
  consented: true,
  suggestion: null,
  onboardingCompleted: true,
  answers: null,
  locationExplained: true,
  inviteToken: null,
  masterSwitch: false,
  backgroundChosen: false,
  backgroundRunning: false,
  declinedParties: [],
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

// Partitions: nothing kept; an older version's data without the field; a value that is not true; kept on.
describe('the kept switch of the answer on the map', () => {
  it('is off on a phone that kept nothing', async () => {
    expect((await readKept()).answerOnMap).toBe(false);
  });

  it("is off on a phone that kept an older version's data, which still counts", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(OLDER));

    const kept = await readKept();

    expect(kept.answerOnMap).toBe(false);
    expect(kept.signedIn).toBe(true);
  });

  it('is off when what was kept is not true', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...OLDER, answerOnMap: 'yes' }));

    expect((await readKept()).answerOnMap).toBe(false);
  });

  it('is on once it was kept on', async () => {
    await keep({ answerOnMap: true });

    expect((await readKept()).answerOnMap).toBe(true);
  });
});
