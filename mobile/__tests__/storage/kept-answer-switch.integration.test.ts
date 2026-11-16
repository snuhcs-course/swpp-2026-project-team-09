/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readKept } from '@/storage/kept';

// What a phone kept while the answer on the map had its switch (P02 ticket 04): the switch is gone, and the rest of
// what was kept still counts.

const KEY = 'snunow.kept';

// What a version with the switch kept: a signed-in User who finished Onboarding, the switch on or off.
function keptWith(answerOnMap: boolean): object {
  return {
    signedIn: true,
    consented: true,
    suggestion: null,
    onboardingCompleted: true,
    answers: null,
    locationExplained: true,
    inviteToken: 'invite-1',
    masterSwitch: true,
    backgroundChosen: true,
    backgroundRunning: false,
    declinedParties: ['quest-1'],
    answerOnMap,
    madeQuests: ['quest-2'],
    pushAsked: true,
    pushUnregisterOwed: false,
  };
}

const OTHER_VALUES = {
  signedIn: true,
  consented: true,
  suggestion: null,
  onboardingCompleted: true,
  answers: null,
  locationExplained: true,
  inviteToken: 'invite-1',
  masterSwitch: true,
  backgroundChosen: true,
  backgroundRunning: false,
  declinedParties: ['quest-1'],
  madeQuests: ['quest-2'],
  pushAsked: true,
  pushUnregisterOwed: false,
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

// Partitions: the switch kept on; kept off.
describe('what a phone kept with the switch of the answer on the map', () => {
  it.each([true, false])('reads its other kept values as before, the switch kept %s', async (answerOnMap) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(keptWith(answerOnMap)));

    expect(await readKept()).toMatchObject(OTHER_VALUES);
  });
});
