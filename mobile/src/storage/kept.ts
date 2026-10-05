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
}

const KEY = 'snunow.kept';

const FIRST_STATE: Kept = {
  signedIn: false,
  consented: false,
  suggestion: null,
  onboardingCompleted: false,
  answers: null,
};

// What a version before the consent screen stored has no `consented`: the rest of it still counts.
function isKept(value: unknown): value is Omit<Kept, 'consented'> {
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
    return { ...value, consented: 'consented' in value && value.consented === true };
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
