/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-08  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Platform, TurboModuleRegistry } from 'react-native';
import { askGoogle, forgetGoogle, googleAvailable } from '@/auth/google';
import { closeHeAccounts, pickHeAccount } from '@/auth/he-accounts';

interface Response {
  type: 'success' | 'noSavedCredentialFound' | 'cancelled';
  data: { idToken: string } | null;
}

// Google's library is native code that Jest cannot load, so a stand-in with the same operations takes its place.
const mockConfigure = jest.fn<void, [unknown]>();
const mockCheckPlayServices = jest.fn<Promise<void>, []>();
const mockCreateAccount = jest.fn<Promise<Response>, []>();
const mockPresentExplicitSignIn = jest.fn<Promise<Response>, []>();
const mockSignOut = jest.fn<Promise<void>, []>();

jest.mock('react-native-nitro-google-signin', () => ({
  GoogleOneTapSignIn: {
    configure: mockConfigure,
    checkPlayServices: mockCheckPlayServices,
    createAccount: mockCreateAccount,
    presentExplicitSignIn: mockPresentExplicitSignIn,
    signOut: mockSignOut,
  },
}));

// A build on Android that holds the native module and was given the web client.
function aBuildWithGoogle(): void {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue({});
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client';
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckPlayServices.mockResolvedValue();
  mockSignOut.mockResolvedValue();
  Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('whether a build can ask Google', () => {
  it('cannot where the native module is missing, as in Expo Go and here in Jest', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client';

    expect(googleAvailable()).toBe(false);
    await expect(forgetGoogle()).rejects.toThrow('holds no Google sign-in');
    expect(mockConfigure).not.toHaveBeenCalled();
  });

  it('cannot without the web client, and can with the module and the client', () => {
    aBuildWithGoogle();
    expect(googleAvailable()).toBe(true);

    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = '';
    expect(googleAvailable()).toBe(false);
  });

  it('needs the iOS client too on iOS, and is never available on the web', () => {
    aBuildWithGoogle();
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(googleAvailable()).toBe(false);

    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client';
    expect(googleAvailable()).toBe(true);

    jest.replaceProperty(Platform, 'OS', 'web');
    expect(googleAvailable()).toBe(false);
  });
});

// On the HE branch (P15) the HE accounts' list takes the place of Google's sheet and chooser.
describe('asking Google', () => {
  beforeEach(aBuildWithGoogle);

  it("gives the key of the HE account picked, and opens neither Google's sheet nor its chooser", async () => {
    const asked = askGoogle();
    pickHeAccount('he-r1a');
    expect(await asked).toEqual({ kind: 'token', idToken: 'he-r1a' });

    const chooser = askGoogle('chooser');
    pickHeAccount('he-s3');
    expect(await chooser).toEqual({ kind: 'token', idToken: 'he-s3' });

    expect(mockCheckPlayServices).not.toHaveBeenCalled();
    expect(mockCreateAccount).not.toHaveBeenCalled();
    expect(mockPresentExplicitSignIn).not.toHaveBeenCalled();
  });

  it('says "cancelled" when the list closes without a pick', async () => {
    const asked = askGoogle();
    closeHeAccounts();

    expect(await asked).toEqual({ kind: 'cancelled' });
  });

  it('forgets the account by signing out of Google', async () => {
    await forgetGoogle();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
