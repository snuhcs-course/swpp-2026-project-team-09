/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-25  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent, userEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import { ONBOARDING } from './support/onboarding';
import { CONSENT_ERROR_REPORTS } from '@/screens/consent-screen';
import { keep, readKept } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';
const TITLE = '약관에 동의해 주세요';
const AGREE = '동의하고 시작';

type User = ReturnType<typeof userEvent.setup>;

async function press(user: User, name: string, wait = 100): Promise<void> {
  await user.press(screen.getByRole('button', { name }));
  await pass(wait);
}

// The app in front of a User who has just signed in.
async function signInFresh(): Promise<User> {
  await startApp();
  await pass(600);
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await press(user, SIGN_IN, 400);
  return user;
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the consent screen', () => {
  it('is shown after the first sign-in, before Onboarding, with the three documents', async () => {
    await signInFresh();

    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
    expect(screen.getByText('SNU Now를 쓰려면 아래 약관에 동의해야 해요.')).toBeVisible();
    for (const name of ['이용약관', '개인정보 처리방침', '위치정보 이용약관']) {
      expect(screen.getByRole('link', { name })).toBeVisible();
    }
    expect(screen.queryByRole('header', { name: ONBOARDING })).toBeNull();
    expect((await readKept()).consented).toBe(false);
  });

  it("names the privacy policy's part on error reports, and how to turn them off", async () => {
    await signInFresh();

    expect(screen.getByText(CONSENT_ERROR_REPORTS)).toBeVisible();
    expect(screen.getByText(/개인정보 처리방침의 '오류 보고'/u)).toBeVisible();
    expect(screen.getByText(/내 정보 › 오류 보고 보내기에서 언제든 끌 수 있어요/u)).toBeVisible();
  });

  it('leads a new User on to Onboarding on "동의하고 시작", and the phone keeps the answer', async () => {
    const user = await signInFresh();
    await press(user, AGREE);

    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect((await readKept()).consented).toBe(true);
  });

  it('leads a User who finished Onboarding on to the main screen', async () => {
    await keep({ onboardingCompleted: true });
    const user = await signInFresh();
    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();

    await press(user, AGREE, 1000);
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  });

  it('signs a User who does not agree out, back to the sign-in screen', async () => {
    const user = await signInFresh();
    await press(user, '로그아웃');

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(await readKept()).toMatchObject({ signedIn: false, consented: false });
  });
});

describe('consent, once on a phone', () => {
  it('is not asked again after a sign-out and a new sign-in', async () => {
    const user = await signInFresh();
    await press(user, AGREE);
    await press(user, '로그아웃');

    await press(user, SIGN_IN, 400);
    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  });

  it('is asked after the loading screen of a signed-in User who has not agreed', async () => {
    await keep({ signedIn: true, onboardingCompleted: true });
    await startApp();
    await pass(600);
    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await press(user, AGREE, 1000);
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  });

  it('cannot be reached by a User who is not signed in', async () => {
    await startApp('/consent');
    await pass(600);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  });
});

describe('a legal document', () => {
  it.each([
    ['이용약관', '(이용약관 내용이 들어갈 것)'],
    ['개인정보 처리방침', '학번, 학적상 이름, 소속'],
    ['위치정보 이용약관', '(위치정보 이용약관 내용이 들어갈 것)'],
  ])('opens from the row "%s" on a screen of its own and closes back to consent', async (title, words) => {
    const user = await signInFresh();

    await user.press(screen.getByRole('link', { name: title }));
    await pass(100);
    expect(screen.getByRole('header', { name: title })).toBeVisible();
    expect(screen.getByText(words)).toBeVisible();

    await press(user, '닫기');
    expect(screen.queryByRole('header', { name: title })).toBeNull();
    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
  });

  it('on privacy says what the library details are for, and that the library session stays on the phone', async () => {
    await startApp('/legal/privacy');

    for (const words of [
      /학번과 학적상 이름은 관정도서관 그룹 스터디룸을 예약할 때만/u,
      /예약할 때마다/u,
      /비밀번호는 SNU Now가 볼 수 없고, 로그인 정보\(세션\)는 휴대폰에만 남아요/u,
    ]) {
      expect(screen.getByText(words)).toBeVisible();
    }
  });

  it('can be read by its address alone, and closes to the start of the app', async () => {
    await startApp('/legal/privacy');
    expect(screen.getByRole('header', { name: '개인정보 처리방침' })).toBeVisible();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await press(user, '닫기', 700);
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });

  it.each(['nothing', '__proto__', 'constructor'])('leads from the name "%s" to the start of the app', async (name) => {
    await startApp(`/legal/${name}`);
    await pass(700);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });
});

describe("the privacy policy's part on error reports", () => {
  it('says what a report holds, what it does not, where it goes, for how long, and how to stop it', async () => {
    await startApp('/legal/privacy');

    expect(screen.getByRole('header', { name: '오류 보고' })).toBeVisible();
    for (const words of [
      /오류를 찾아 고치기 위해 오류 보고를 보내요/u,
      /오류의 내용\(오류 메시지는 200자까지\)과 앱 코드에서 오류가 난 곳, 그때까지 본 화면의 이름과 앱이 서버에 보낸 요청의 종류·결과\(둘 다 주소에서 id를 지운 것\), 앱의 버전과 업데이트, 휴대폰의 기종과 OS 버전, 계정의 내부 id/u,
      /이름·이메일·학번이 아니에요/u,
      /앱을 연 횟수와 오류 없이 끝났는지도 함께 보내요/u,
      /^이름, 이메일, 학번, 위치, 친구, 파티 제목은 보내지 않아요\./u,
      /오류 메시지에 입력한 내용이 섞여 있으면 그 부분이 함께 담길 수 있어요/u,
      /네이티브 부분이 멈춘 경우에는 휴대폰의 오류 보고 기능이 .* 그대로 보내요/u,
      /Functional Software, Inc\.\(Sentry\)가 받아 미국에 있는 서버에 보관해요\(개인정보의 국외 이전\)\. 보관 기간은 Sentry가 SNU Now의 요금제에 정해 둔 기간이고, 그 기간이 지나면 Sentry가 지워요/u,
      /처음에 켜져 있어요\. 내 정보 › 오류 보고 보내기에서 언제든 끌 수 있고, 꺼 두는 동안에는 아무것도 보내지 않아요/u,
      /다시 켤 때에만 보내요/u,
    ]) {
      expect(screen.getByText(words)).toBeVisible();
    }
    // The parts written before stay.
    expect(screen.getByRole('header', { name: '학번, 학적상 이름, 소속' })).toBeVisible();
    expect(screen.getByRole('header', { name: '도서관 로그인' })).toBeVisible();
  });

  it.each([
    ['/legal/privacy?part=error-reports', true],
    ['/legal/privacy', false],
  ])('opened at %s, is scrolled to the part on error reports: %s', async (address, scrolled) => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await startApp(address);
    await fireEvent(screen.getByTestId('legal-part-error-reports'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 640, width: 390, height: 300 } },
    });

    if (scrolled) {
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 640, animated: false });
    } else {
      expect(scrollTo).not.toHaveBeenCalled();
    }
    scrollTo.mockRestore();
  });
});
