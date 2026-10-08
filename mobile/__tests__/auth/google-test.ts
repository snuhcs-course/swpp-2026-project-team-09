import { Platform, TurboModuleRegistry } from 'react-native';
import { askGoogle, forgetGoogle, googleAvailable } from '@/auth/google';

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

const CANCELLED: Response = { type: 'cancelled', data: null };
const NO_ACCOUNT: Response = { type: 'noSavedCredentialFound', data: null };

function success(idToken: string): Response {
  return { type: 'success', data: { idToken } };
}

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
    await expect(askGoogle()).rejects.toThrow('holds no Google sign-in');
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

describe('asking Google', () => {
  beforeEach(aBuildWithGoogle);

  it("gives the chosen account's ID token, asked for the web client and no hosted domain", async () => {
    mockCreateAccount.mockResolvedValue(success('the-token'));

    expect(await askGoogle()).toEqual({ kind: 'token', idToken: 'the-token' });
    expect(mockConfigure).toHaveBeenCalledWith({ webClientId: 'web-client', iosClientId: null });
    expect(mockPresentExplicitSignIn).not.toHaveBeenCalled();
  });

  it('says "cancelled" when the User closes the sheet', async () => {
    mockCreateAccount.mockResolvedValue(CANCELLED);

    expect(await askGoogle()).toEqual({ kind: 'cancelled' });
  });

  it("opens Google's own dialog on a phone that has no account to list", async () => {
    mockCreateAccount.mockResolvedValue(NO_ACCOUNT);
    mockPresentExplicitSignIn.mockResolvedValue(success('added'));

    expect(await askGoogle()).toEqual({ kind: 'token', idToken: 'added' });
  });

  it('throws when no account comes of it, when Play services are missing and when Google refuses', async () => {
    mockCreateAccount.mockResolvedValue(NO_ACCOUNT);
    mockPresentExplicitSignIn.mockResolvedValue(NO_ACCOUNT);
    await expect(askGoogle()).rejects.toThrow('Google gave no account');

    mockCreateAccount.mockRejectedValue(new Error('DEVELOPER_ERROR'));
    await expect(askGoogle()).rejects.toThrow('DEVELOPER_ERROR');

    mockCheckPlayServices.mockRejectedValue(new Error('PLAY_SERVICES_NOT_AVAILABLE'));
    await expect(askGoogle()).rejects.toThrow('PLAY_SERVICES_NOT_AVAILABLE');
  });

  it('forgets the account by signing out of Google', async () => {
    await forgetGoogle();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("asking Google's chooser", () => {
  beforeEach(aBuildWithGoogle);

  it("opens Google's chooser, which can add an account, when asked that way, and not the phone's sheet", async () => {
    mockPresentExplicitSignIn.mockResolvedValue(success('another'));

    expect(await askGoogle('chooser')).toEqual({ kind: 'token', idToken: 'another' });
    expect(mockCheckPlayServices).toHaveBeenCalledTimes(1);
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it('says "cancelled" when the User closes the chooser, and throws when it gives no account', async () => {
    mockPresentExplicitSignIn.mockResolvedValue(CANCELLED);
    expect(await askGoogle('chooser')).toEqual({ kind: 'cancelled' });

    mockPresentExplicitSignIn.mockResolvedValue(NO_ACCOUNT);
    await expect(askGoogle('chooser')).rejects.toThrow('Google gave no account');
  });
});
