/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Settings for development, given when the app is started as `EXPO_PUBLIC_` variables. A released app ignores them.
//
//   EXPO_PUBLIC_SIGN_IN_ENDING=cancelled        the sign-in is the mock and ends so: signed-in, cancelled, not-snu-account, failed
//   EXPO_PUBLIC_MOCK_SLOW=listFriends,listQuests  these mocks answer after three seconds
//   EXPO_PUBLIC_MOCK_FAIL=enterLobby             these mocks answer with a failure
//   EXPO_PUBLIC_MOCK_EMPTY=listFriends           these mocks answer with nothing
//   EXPO_PUBLIC_FIRST_STATE=1                    what the phone keeps is cleared when the app starts
//   EXPO_PUBLIC_CAMPUS_WALK=1                    the phone's position is replaced by a walk along a fixed path on campus

export type SignInEnding = 'signed-in' | 'cancelled' | 'not-snu-account' | 'failed';

const SIGN_IN_ENDINGS: readonly SignInEnding[] = ['signed-in', 'cancelled', 'not-snu-account', 'failed'];

export type MockBehaviour = 'normal' | 'slow' | 'fail' | 'empty';

function isSignInEnding(value: string | undefined): value is SignInEnding {
  return SIGN_IN_ENDINGS.some((ending) => ending === value);
}

function names(list: string | undefined): string[] {
  return (list ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

// Each variable is read by its full name, because the bundler replaces only those.
// The ending that the setting names, or null without the setting. A named ending also keeps the sign-in a mock in a
// build that could ask Google.
export function namedSignInEnding(): SignInEnding | null {
  const ending = process.env.EXPO_PUBLIC_SIGN_IN_ENDING;
  return __DEV__ && isSignInEnding(ending) ? ending : null;
}

export function signInEnding(): SignInEnding {
  return namedSignInEnding() ?? 'signed-in';
}

// How the mock of one operation answers. A failure wins over nothing, and nothing over a slow answer.
export function mockBehaviour(operation: string): MockBehaviour {
  if (!__DEV__) {
    return 'normal';
  }
  if (names(process.env.EXPO_PUBLIC_MOCK_FAIL).includes(operation)) {
    return 'fail';
  }
  if (names(process.env.EXPO_PUBLIC_MOCK_EMPTY).includes(operation)) {
    return 'empty';
  }
  if (names(process.env.EXPO_PUBLIC_MOCK_SLOW).includes(operation)) {
    return 'slow';
  }
  return 'normal';
}

export function startsFromFirstState(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_FIRST_STATE === '1';
}

// The User's position is a walk on campus and the phone is not asked for one.
export function walksOnCampus(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_CAMPUS_WALK === '1';
}
