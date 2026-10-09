// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46, reviewed by Jaehyun0320 in #51
import AsyncStorage from '@react-native-async-storage/async-storage';
import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import type { OnboardingAnswers } from '@/api/types';
import { signIn, signOut } from '@/auth/sign-in';
import { keep, openKept, readKept } from '@/storage/kept';

const ANSWERS: OnboardingAnswers = {
  name: '홍길동',
  department: '컴퓨터공학부',
  admissionYear: 2022,
  hashtags: ['AI커리어', '러닝'],
  courseLevel: 'graduate',
  gender: { kind: 'custom', text: '논바이너리' },
};

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

// What the background sharing keeps, which nothing here changes.
const NO_BACKGROUND = { masterSwitch: false, backgroundChosen: false, backgroundRunning: false };

const FIRST_STATE = {
  signedIn: false,
  consented: false,
  suggestion: null,
  onboardingCompleted: false,
  answers: null,
  locationExplained: false,
  inviteToken: null,
  ...NO_BACKGROUND,
  declinedParties: [],
};

describe('sign-in', () => {
  it('signs a new User in with a suggestion for Onboarding, and the phone keeps both', async () => {
    const result = await answered(signIn());

    expect(result).toEqual({
      outcome: 'signed-in',
      onboarding: { completed: false, suggestion: { name: '안진영', department: null } },
    });
    expect(await readKept()).toEqual({
      signedIn: true,
      consented: false,
      suggestion: { name: '안진영', department: null },
      onboardingCompleted: false,
      answers: null,
      locationExplained: false,
      inviteToken: null,
      ...NO_BACKGROUND,
      declinedParties: [],
    });
  });

  it.each(['cancelled', 'not-snu-account', 'failed'] as const)(
    'ends in "%s" when the development setting names it, and keeps nothing',
    async (ending) => {
      process.env.EXPO_PUBLIC_SIGN_IN_ENDING = ending;

      expect(await answered(signIn())).toEqual({ outcome: ending });
      expect((await readKept()).signedIn).toBe(false);
    },
  );

  it('ignores an ending it does not know', async () => {
    process.env.EXPO_PUBLIC_SIGN_IN_ENDING = 'something';

    expect((await answered(signIn())).outcome).toBe('signed-in');
  });
});

describe('what the phone keeps', () => {
  it('keeps the sign-in and the answers of Onboarding for the next start of the app', async () => {
    await answered(signIn());
    await answered(mockClient.completeOnboarding(ANSWERS));

    // The next start reads the phone again: nothing lives in the app's memory.
    expect(await openKept()).toEqual({
      signedIn: true,
      consented: false,
      suggestion: null,
      onboardingCompleted: true,
      answers: ANSWERS,
      locationExplained: false,
      inviteToken: null,
      ...NO_BACKGROUND,
      declinedParties: [],
    });
  });

  it('remembers after a sign-out that the User finished Onboarding', async () => {
    await answered(signIn());
    await answered(mockClient.completeOnboarding(ANSWERS));
    await signOut();

    expect((await readKept()).signedIn).toBe(false);
    expect(await answered(signIn())).toEqual({ outcome: 'signed-in', onboarding: { completed: true } });
  });

  it('is cleared at the start of the app when the development setting asks for the first state', async () => {
    await answered(signIn());
    await answered(mockClient.completeOnboarding(ANSWERS));
    await keep({ consented: true, locationExplained: true });
    process.env.EXPO_PUBLIC_FIRST_STATE = '1';

    expect(await openKept()).toEqual(FIRST_STATE);
  });

  it('treats what it cannot read as the first state', async () => {
    await AsyncStorage.setItem('snunow.kept', '{"signedIn":"yes"');
    expect((await readKept()).signedIn).toBe(false);

    await AsyncStorage.setItem('snunow.kept', '{"signedIn":"yes","onboardingCompleted":true}');
    expect(await readKept()).toEqual(FIRST_STATE);
  });
});

describe('what the phone keeps of the consent', () => {
  it('reads what a version without consent stored, as not agreed yet', async () => {
    const stored = { signedIn: true, suggestion: null, onboardingCompleted: true, answers: ANSWERS };
    await AsyncStorage.setItem('snunow.kept', JSON.stringify(stored));

    expect(await readKept()).toEqual({
      ...stored,
      consented: false,
      locationExplained: false,
      inviteToken: null,
      ...NO_BACKGROUND,
      declinedParties: [],
    });
  });

  it('reads what a version without the location explanation stored, as not answered yet', async () => {
    const stored = { signedIn: true, consented: true, suggestion: null, onboardingCompleted: true, answers: ANSWERS };
    await AsyncStorage.setItem('snunow.kept', JSON.stringify(stored));

    expect(await readKept()).toEqual({
      ...stored,
      locationExplained: false,
      inviteToken: null,
      ...NO_BACKGROUND,
      declinedParties: [],
    });
    expect((await keep({ locationExplained: true })).locationExplained).toBe(true);
    expect(await readKept()).toEqual({
      ...stored,
      locationExplained: true,
      inviteToken: null,
      ...NO_BACKGROUND,
      declinedParties: [],
    });
  });

  it('remembers after a sign-out that the User agreed to the legal documents', async () => {
    await keep({ signedIn: true, consented: true });
    await signOut();

    expect((await readKept()).consented).toBe(true);
  });

  it('keeps both of two changes made at once', async () => {
    await Promise.all([keep({ signedIn: true }), keep({ onboardingCompleted: true })]);

    expect(await readKept()).toMatchObject({ signedIn: true, onboardingCompleted: true });
  });
});

describe('the Lobby', () => {
  it('is refused until Onboarding is finished', async () => {
    await answered(signIn());

    await expect(answered(mockClient.enterLobby())).rejects.toMatchObject({ status: 403, code: 'ONBOARDING_REQUIRED' });
  });

  it("gives the profile that Onboarding's answers made", async () => {
    await answered(signIn());
    await answered(mockClient.completeOnboarding(ANSWERS));

    expect(await answered(mockClient.enterLobby())).toEqual({
      profile: {
        name: '홍길동',
        department: '컴퓨터공학부',
        admissionYear: 2022,
        hashtags: ['AI커리어', '러닝'],
        friendId: '7KX2M9QD',
      },
      masterSwitch: false,
    });
  });
});
