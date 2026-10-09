// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-09, prompted by AhnJinYoung and Jaehyun0320, reviewed by fyoon46 in #74
import { idTokenOf } from '../support/id-token';
import { answered, startFresh } from '../support/mocks';
import type { GoogleAnswer } from '@/auth/google';
import { askGoogle, forgetGoogle, googleAvailable } from '@/auth/google';
import { signIn, signOut } from '@/auth/sign-in';
import { keep, readKept } from '@/storage/kept';

// The one file that touches Google's library is replaced, so that no test opens Google's sheet.
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn<Promise<GoogleAnswer>, []>(),
  forgetGoogle: jest.fn<Promise<void>, []>(),
}));

const SNU_TOKEN = idTokenOf({ email: 'gildong@snu.ac.kr', hd: 'snu.ac.kr', name: '홍길동' });
const GMAIL_TOKEN = idTokenOf({ email: 'someone@gmail.com', name: 'Some One' });

function googleGives(idToken: string): void {
  jest.mocked(askGoogle).mockResolvedValue({ kind: 'token', idToken });
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(true);
  jest.mocked(askGoogle).mockReset();
  jest.mocked(forgetGoogle).mockReset().mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a sign-in with Google', () => {
  it("signs an SNU account in with the account's name as the suggestion, and the phone keeps both", async () => {
    googleGives(SNU_TOKEN);

    expect(await answered(signIn())).toEqual({
      outcome: 'signed-in',
      onboarding: { completed: false, suggestion: { name: '홍길동', department: null } },
    });
    expect(await readKept()).toMatchObject({ signedIn: true, suggestion: { name: '홍길동', department: null } });
    expect(forgetGoogle).not.toHaveBeenCalled();
  });

  it('suggests no name when the account gives none', async () => {
    googleGives(idTokenOf({ email: 'gildong@snu.ac.kr', hd: 'snu.ac.kr' }));

    expect(await answered(signIn())).toEqual({
      outcome: 'signed-in',
      onboarding: { completed: false, suggestion: { name: null, department: null } },
    });
  });

  it('knows a User who finished Onboarding on this phone before', async () => {
    await keep({ onboardingCompleted: true });
    googleGives(SNU_TOKEN);

    expect(await answered(signIn())).toEqual({ outcome: 'signed-in', onboarding: { completed: true } });
    expect(await readKept()).toMatchObject({ signedIn: true, suggestion: null });
  });

  it.each([
    ['a Gmail account, which has no hosted domain', GMAIL_TOKEN],
    ["another organisation's account", idTokenOf({ email: 'a@korea.ac.kr', hd: 'korea.ac.kr', name: '김' })],
  ])('refuses %s, forgets it and keeps nothing', async (_what, idToken) => {
    googleGives(idToken);

    expect(await answered(signIn())).toEqual({ outcome: 'not-snu-account' });
    expect(forgetGoogle).toHaveBeenCalledTimes(1);
    expect((await readKept()).signedIn).toBe(false);
  });

  it('still says that the account is outside SNU when forgetting it fails', async () => {
    googleGives(GMAIL_TOKEN);
    jest.mocked(forgetGoogle).mockRejectedValue(new Error('no Google'));

    expect(await answered(signIn())).toEqual({ outcome: 'not-snu-account' });
  });
});

describe("a sign-in through Google's chooser", () => {
  it("asks Google's chooser, and the phone's accounts when no way is named", async () => {
    googleGives(SNU_TOKEN);

    expect((await answered(signIn('chooser'))).outcome).toBe('signed-in');
    expect(askGoogle).toHaveBeenLastCalledWith('chooser');

    await answered(signIn());
    expect(askGoogle).toHaveBeenLastCalledWith('phone-accounts');
  });

  it('refuses an account outside SNU as the sheet does, and ends in "cancelled" when the chooser is closed', async () => {
    googleGives(GMAIL_TOKEN);
    expect(await answered(signIn('chooser'))).toEqual({ outcome: 'not-snu-account' });
    expect(forgetGoogle).toHaveBeenCalledTimes(1);

    jest.mocked(askGoogle).mockResolvedValue({ kind: 'cancelled' });
    expect(await answered(signIn('chooser'))).toEqual({ outcome: 'cancelled' });
    expect((await readKept()).signedIn).toBe(false);
  });

  it('uses the mock where Google is not available', async () => {
    jest.mocked(googleAvailable).mockReturnValue(false);

    expect((await answered(signIn('chooser'))).outcome).toBe('signed-in');
    expect(askGoogle).not.toHaveBeenCalled();
  });
});

describe('a sign-in with Google that does not sign in', () => {
  it('ends in "cancelled" when the User closes the sheet', async () => {
    jest.mocked(askGoogle).mockResolvedValue({ kind: 'cancelled' });

    expect(await answered(signIn())).toEqual({ outcome: 'cancelled' });
    expect((await readKept()).signedIn).toBe(false);
  });

  it('ends in "failed" when Google throws', async () => {
    jest.mocked(askGoogle).mockRejectedValue(new Error('DEVELOPER_ERROR'));

    expect(await answered(signIn())).toEqual({ outcome: 'failed' });
    expect((await readKept()).signedIn).toBe(false);
  });

  it.each(['not-a-token', 'a.b.c', ''])('ends in "failed" when the token "%s" cannot be read', async (idToken) => {
    googleGives(idToken);

    expect(await answered(signIn())).toEqual({ outcome: 'failed' });
    expect((await readKept()).signedIn).toBe(false);
  });
});

describe('the choice between Google and the mock', () => {
  it('uses the mock when Google is not available', async () => {
    jest.mocked(googleAvailable).mockReturnValue(false);

    expect(await answered(signIn())).toEqual({
      outcome: 'signed-in',
      onboarding: { completed: false, suggestion: { name: '안진영', department: null } },
    });
    expect(askGoogle).not.toHaveBeenCalled();
  });

  it.each(['signed-in', 'cancelled', 'not-snu-account', 'failed'] as const)(
    'uses the mock when the development setting names the ending "%s"',
    async (ending) => {
      process.env.EXPO_PUBLIC_SIGN_IN_ENDING = ending;

      expect((await answered(signIn())).outcome).toBe(ending);
      expect(askGoogle).not.toHaveBeenCalled();
    },
  );

  it('asks Google when the development setting names an ending it does not know', async () => {
    process.env.EXPO_PUBLIC_SIGN_IN_ENDING = 'something';
    googleGives(SNU_TOKEN);

    expect((await answered(signIn())).outcome).toBe('signed-in');
    expect(askGoogle).toHaveBeenCalledTimes(1);
  });
});

describe('a sign-out', () => {
  it('forgets the Google account, so that the next press shows the sheet again', async () => {
    googleGives(SNU_TOKEN);
    await answered(signIn());

    await signOut();

    expect(forgetGoogle).toHaveBeenCalledTimes(1);
    expect((await readKept()).signedIn).toBe(false);
  });

  it('signs out on the phone also when Google cannot forget', async () => {
    await keep({ signedIn: true });
    jest.mocked(forgetGoogle).mockRejectedValue(new Error('no Google'));

    await signOut();

    expect((await readKept()).signedIn).toBe(false);
  });

  it('leaves Google alone where it is not available', async () => {
    jest.mocked(googleAvailable).mockReturnValue(false);

    await signOut();

    expect(forgetGoogle).not.toHaveBeenCalled();
  });
});
