/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingAnswers, Suggestion } from '@/api/types';
import { startsFromFirstState } from '@/dev-settings';

// What the phone keeps so that the app can open again where the User left it.
export interface Kept {
  signedIn: boolean;
  // The User agreed to the legal documents on this phone. A sign-out leaves it as it is.
  consented: boolean;
  // What the sign-in suggested for Onboarding's name and department. Null once Onboarding is finished.
  suggestion: Suggestion | null;
  onboardingCompleted: boolean;
  // The Onboarding's answers. The course level and the gender live nowhere else.
  answers: OnboardingAnswers | null;
  // The User answered the explanation before the location prompt on this phone, so the main screen does not show it
  // by itself again.
  locationExplained: boolean;
  // The token of the Invite Link the app was opened with, until its accept screen shows it. A later link replaces it.
  inviteToken: string | null;
  // For the background task, which has no screens to ask: the Master Switch as the app last knew it, whether the User
  // chose background sharing on this phone, and whether it was started and not stopped by the app since.
  masterSwitch: boolean;
  backgroundChosen: boolean;
  backgroundRunning: boolean;
  // The running Parties whose 활성화 the User declined on this phone, by id. The main server stores no decline.
  declinedParties: string[];
}

const KEY = 'snunow.kept';

const FIRST_STATE: Kept = {
  signedIn: false,
  consented: false,
  suggestion: null,
  onboardingCompleted: false,
  answers: null,
  locationExplained: false,
  inviteToken: null,
  masterSwitch: false,
  backgroundChosen: false,
  backgroundRunning: false,
  declinedParties: [],
};

type Later =
  | 'consented'
  | 'locationExplained'
  | 'inviteToken'
  | 'masterSwitch'
  | 'backgroundChosen'
  | 'backgroundRunning'
  | 'declinedParties';

// What an older version stored lacks the fields added later: the rest of it still counts.
function isKept(value: unknown): value is Omit<Kept, Later> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'signedIn' in value &&
    typeof value.signedIn === 'boolean' &&
    'onboardingCompleted' in value &&
    typeof value.onboardingCompleted === 'boolean' &&
    'suggestion' in value &&
    'answers' in value
  );
}

// A phone that keeps nothing, or something this version cannot read, is in the first state.
export async function readKept(): Promise<Kept> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored === null) {
    return FIRST_STATE;
  }
  try {
    const value: unknown = JSON.parse(stored);
    if (!isKept(value)) {
      return FIRST_STATE;
    }
    return {
      ...value,
      consented: 'consented' in value && value.consented === true,
      locationExplained: 'locationExplained' in value && value.locationExplained === true,
      inviteToken: 'inviteToken' in value && typeof value.inviteToken === 'string' ? value.inviteToken : null,
      masterSwitch: 'masterSwitch' in value && value.masterSwitch === true,
      backgroundChosen: 'backgroundChosen' in value && value.backgroundChosen === true,
      backgroundRunning: 'backgroundRunning' in value && value.backgroundRunning === true,
      declinedParties:
        'declinedParties' in value && Array.isArray(value.declinedParties)
          ? value.declinedParties.filter((id): id is string => typeof id === 'string')
          : [],
    };
  } catch {
    return FIRST_STATE;
  }
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

export function keep(change: Partial<Kept>): Promise<Kept> {
  const written = lastChange.then(async () => {
    const kept = { ...(await readKept()), ...change };
    await AsyncStorage.setItem(KEY, JSON.stringify(kept));
    return kept;
  });
  // A change that failed is told to the one who asked for it, and does not stop the next.
  lastChange = written.catch(() => null);
  return written;
}

// What the phone keeps once the changes on their way are written.
export async function readKeptAfterChanges(): Promise<Kept> {
  await lastChange;
  return readKept();
}

export async function clearKept(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

// What the app reads when it starts. The development setting for the first state clears the phone before the read.
export async function openKept(): Promise<Kept> {
  if (startsFromFirstState()) {
    await clearKept();
  }
  const kept = await readKept();
  return kept;
}
