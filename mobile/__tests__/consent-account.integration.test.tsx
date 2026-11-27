/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { fireEvent, userEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { pass, screen, startApp } from './support/app';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { idTokenOf } from './support/id-token';
import { SIGN_IN } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW, TOKENS } from './support/server';
import { askGoogle } from '@/auth/google';
import { dropHeldTokens } from '@/auth/tokens';
import { CONSENT_NOT_SAVED, USAGE_ITEM } from '@/screens/consent-screen';
import { keep, readKept } from '@/storage/kept';

// The consent screen against the fake main server (P08 ticket 11): the account's consent decides whether it asks, its
// answer goes to the account with the choice on usage data, and the privacy policy has the part it links to.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const TITLE = '약관에 동의해 주세요';
const AGREE = '동의하고 시작';
const AGREED = { version: 1, usage: false };
const NO_CONSENT = { version: null, usage: null };

type User = ReturnType<typeof userEvent.setup>;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: false });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The sign-in screen's button, the main server answering with the account's consent, or without the field.
async function signInWith(consent: unknown): Promise<User> {
  const body = { ...TOKENS, onboarding: { completed: true }, ...(consent === undefined ? {} : { consent }) };
  server.on('POST /auth/google', { status: 200, body });
  jest.mocked(askGoogle).mockResolvedValue({
    kind: 'token',
    idToken: idTokenOf({ email: 'gildong@snu.ac.kr', hd: 'snu.ac.kr', name: '홍길동' }),
  });
  await startApp();
  await pass(1000);
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: SIGN_IN }));
  await pass(1000);
  return user;
}

// A start of the app with a kept Session.
async function startSignedIn(): Promise<User> {
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  await startApp();
  await pass(1000);
  await pass(1000);
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

async function press(user: User, name: string): Promise<void> {
  await user.press(screen.getByRole('button', { name }));
  await pass(1000);
}

function consentSent(): unknown[] {
  return server.received('PUT /users/me/consent').map(({ body }) => body);
}

describe('whether the consent screen asks, after a sign-in on a phone that kept nothing', () => {
  it.each([
    ['no version', NO_CONSENT],
    ['no field', undefined],
  ])('asks for an account with %s', async (_name, consent) => {
    await signInWith(consent);

    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
  });

  it('does not ask for an account with version 1, and the phone keeps its copy', async () => {
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, consent: { version: 1, usage: true } } });
    await signInWith({ version: 1, usage: true });

    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
    expect((await readKept()).consent).toEqual({ version: 1, usage: true });
  });
});

describe('whether the consent screen asks, at a start with a kept Session', () => {
  it('asks a User who agreed on no phone', async () => {
    await keep({ signedIn: true, onboardingCompleted: true });
    await startSignedIn();

    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
    expect(server.received('POST /lobby')).toHaveLength(0);
  });

  it('does not ask when the copy holds version 1', async () => {
    await keep({ signedIn: true, consented: true, consent: AGREED, onboardingCompleted: true });
    await startSignedIn();

    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  });

  it('does not ask when the copy holds version 1 and no network answers', async () => {
    await keep({ signedIn: true, consent: AGREED, onboardingCompleted: true });
    server = await askMainServer({ signedIn: true });
    server.on('POST /lobby', 'no-answer');
    await startApp();
    await pass(1000);
    await pass(1000);

    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  });

  it("follows the Lobby's consent for the next start", async () => {
    await keep({ signedIn: true, consent: AGREED, onboardingCompleted: true });
    server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, consent: { version: 1, usage: true } } });
    await startApp();
    await pass(1000);
    await pass(1000);

    expect((await readKept()).consent).toEqual({ version: 1, usage: true });
  });
});

describe('"동의하고 시작"', () => {
  it('has the box not ticked at first, and sends version 1 without usage data', async () => {
    server.on('PUT /users/me/consent', { status: 204 });
    const user = await signInWith(NO_CONSENT);

    expect(screen.getByRole('checkbox', { name: USAGE_ITEM.label })).not.toBeChecked();
    expect(screen.getByText(USAGE_ITEM.sentence)).toBeVisible();
    await press(user, AGREE);

    expect(consentSent()).toEqual([{ version: 1, usage: false }]);
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
    expect((await readKept()).consent).toEqual({ version: 1, usage: false });
  });

  it('sends the ticked box, and the next start does not ask again', async () => {
    await keep({ signedIn: true, onboardingCompleted: true });
    const user = await startSignedIn();
    server.on('PUT /users/me/consent', { status: 204 });
    // The account as it holds the consent from then on.
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, consent: { version: 1, usage: true } } });

    await user.press(screen.getByRole('checkbox', { name: USAGE_ITEM.label }));
    expect(screen.getByRole('checkbox', { name: USAGE_ITEM.label })).toBeChecked();
    await press(user, AGREE);
    expect(consentSent()).toEqual([{ version: 1, usage: true }]);
    expect((await readKept()).consent).toEqual({ version: 1, usage: true });

    await screen.unmount();
    dropHeldTokens();
    await startApp();
    await pass(1000);
    await pass(1000);
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  });
});

describe('a failed "동의하고 시작"', () => {
  it.each<[string, Reply]>([
    ['a refusal', refusal(500)],
    ['no answer', 'no-answer'],
  ])('keeps the User on the screen after %s, says so, and sends again on a second press', async (_name, reply) => {
    server.on('PUT /users/me/consent', reply);
    const user = await signInWith(NO_CONSENT);

    await press(user, AGREE);
    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
    expect(screen.getByText(CONSENT_NOT_SAVED)).toBeVisible();
    expect((await readKept()).consent).toEqual(NO_CONSENT);

    server.on('PUT /users/me/consent', { status: 204 });
    await press(user, AGREE);
    expect(consentSent()).toHaveLength(2);
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect((await readKept()).consent).toEqual(AGREED);
  });

  it('leaves "로그아웃" as it was: the User signs out, and nothing is sent', async () => {
    server.on('POST /auth/sign-out', { status: 204 });
    const user = await signInWith(NO_CONSENT);

    await press(user, '로그아웃');
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(consentSent()).toHaveLength(0);
    expect((await readKept()).consent).toEqual(NO_CONSENT);
  });
});

describe("the privacy policy's part on usage data", () => {
  it('has its heading and seven paragraphs, after the part on error reports', async () => {
    await startApp('/legal/privacy');

    const headings = screen.getAllByRole('header').map((heading) => heading.props.children as unknown);
    expect(headings.slice(-2)).toEqual(['오류 보고', '사용 기록']);
    for (const words of [
      /^SNU Now를 어떻게 쓰는지 알고 고치기 위해, '사용 기록 보내기'를 켠 경우에만 사용 기록을 보내요\.$/u,
      /^사용 기록에는 앱을 연 때, 연 화면의 이름\(주소에서 id를 지운 것\).*실패 이유도 담겨요\.$/u,
      /^SNU Now 서버도 AI 어시스턴트의 답, 파티 만들기, 파티 참여, 친구 맺기를 마치면 그 사실을 같은 방식으로 보내요\.$/u,
      /^함께 담기는 것은 계정의 내부 id, 앱의 이름·버전·빌드 번호, 휴대폰의 제조사·기종·OS 버전·화면 크기, 그리고 앱을 한 번 쓰는 동안의 무작위 세션 번호예요\./u,
      /^이름, 이메일, 학번, 위치, 친구 목록, 파티 제목, 장소, .* IP 주소도 남기지 않아요\.$/u,
      /^사용 기록은 PostHog, Inc\.가 받아 미국\(버지니아\)에 있는 서버에 보관해요\(개인정보의 국외 이전\)\..*보관 기간은 1년이고/u,
      /^사용 기록 보내기는 선택이에요\..*PostHog에 남고, 그 뒤에 지워져요\.$/u,
    ]) {
      expect(screen.getByText(words)).toBeVisible();
    }
  });

  it("opens from the consent screen's item at the part", async () => {
    const user = await signInWith(NO_CONSENT);
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');

    await user.press(screen.getByRole('link', { name: USAGE_ITEM.link }));
    await pass(500);
    expect(screen.getByRole('header', { name: '개인정보 처리방침' })).toBeVisible();
    await fireEvent(screen.getByTestId('legal-part-usage'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, width: 390, height: 400 } },
    });
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 900, animated: false });
    scrollTo.mockRestore();

    await press(user, '닫기');
    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
  });
});
