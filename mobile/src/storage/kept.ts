/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Consent, OnboardingAnswers, Suggestion } from '@/api/types';
import { startsFromFirstState } from '@/dev-settings';

// What the phone keeps so that the app can open again where the User left it.
export interface Kept {
  signedIn: boolean;
  // The User agreed to the legal documents on this phone, as versions before P08 ticket 11 kept it. Nothing writes it
  // true any more. It is read once, to carry the consent over to an account that holds none (`consentScreenAsks`), and
  // the consent's answer sets it false. A sign-out leaves it as it is.
  consented: boolean;
  // The phone's copy of the account's consent (`src/consent/`), from the sign-in's answer, each Lobby, the consent's
  // answer and the switch "사용 기록 보내기". Emptied at a sign-out and at a Session's end.
  consent: Consent;
  // The mock build's stand-in for the account's consent, which the mock's sign-in copies. A sign-out leaves it, as an
  // account keeps its consent. Never written where the app asks the main server.
  mockAccountConsent: Consent;
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
  // The Quests made from a Plan on this phone, by id. The main server marks no such Quest.
  madeQuests: string[];
  // The sheet that asks about push was shown on this phone. A sign-out leaves it as it is.
  pushAsked: boolean;
  // An unregistering from push failed at the end of a Session, and is tried again until it goes through.
  pushUnregisterOwed: boolean;
}

const KEY = 'snunow.kept';

const FIRST_STATE: Kept = {
  signedIn: false,
  consented: false,
  consent: { version: null, usage: null },
  mockAccountConsent: { version: null, usage: null },
  suggestion: null,
  onboardingCompleted: false,
  answers: null,
  locationExplained: false,
  inviteToken: null,
  masterSwitch: false,
  backgroundChosen: false,
  backgroundRunning: false,
  declinedParties: [],
  madeQuests: [],
  pushAsked: false,
  pushUnregisterOwed: false,
};

type Later =
  | 'consented'
  | 'consent'
  | 'mockAccountConsent'
  | 'locationExplained'
  | 'inviteToken'
  | 'masterSwitch'
  | 'backgroundChosen'
  | 'backgroundRunning'
  | 'declinedParties'
  | 'madeQuests'
  | 'pushAsked'
  | 'pushUnregisterOwed';

// A consent as this version stored it; anything else is no consent.
function consentIn(value: object, name: string): Consent {
  const consent: unknown = Reflect.get(value, name);
  if (typeof consent !== 'object' || consent === null) {
    return { version: null, usage: null };
  }
  const version: unknown = Reflect.get(consent, 'version');
  const usage: unknown = Reflect.get(consent, 'usage');
  return {
    version: typeof version === 'number' && Number.isInteger(version) ? version : null,
    usage: typeof usage === 'boolean' ? usage : null,
  };
}

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
      consent: consentIn(value, 'consent'),
      mockAccountConsent: consentIn(value, 'mockAccountConsent'),
      locationExplained: 'locationExplained' in value && value.locationExplained === true,
      inviteToken: 'inviteToken' in value && typeof value.inviteToken === 'string' ? value.inviteToken : null,
      masterSwitch: 'masterSwitch' in value && value.masterSwitch === true,
      backgroundChosen: 'backgroundChosen' in value && value.backgroundChosen === true,
      backgroundRunning: 'backgroundRunning' in value && value.backgroundRunning === true,
      declinedParties:
        'declinedParties' in value && Array.isArray(value.declinedParties)
          ? value.declinedParties.filter((id): id is string => typeof id === 'string')
          : [],
      madeQuests:
        'madeQuests' in value && Array.isArray(value.madeQuests)
          ? value.madeQuests.filter((id): id is string => typeof id === 'string')
          : [],
      pushAsked: 'pushAsked' in value && value.pushAsked === true,
      pushUnregisterOwed: 'pushUnregisterOwed' in value && value.pushUnregisterOwed === true,
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
