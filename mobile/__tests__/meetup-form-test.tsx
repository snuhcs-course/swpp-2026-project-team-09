// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { pass, screen, shownAddress } from './support/app';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';

// The Meetup form, the `PartyAppt` frame opened from a Friend, and 장소 선택's list in its event mode, against the
// mocks. The mocks' clock stands at 1 October 2026, 13:37 in Korea.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

type User = Awaited<ReturnType<typeof openMain>>;

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openForm(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
  await user.press(screen.getByRole('button', { name: '김민준님과 파티 만들기' }));
  await pass(300);
  return user;
}

function sendButton(): ReturnType<typeof screen.getByRole> {
  const button = screen.getAllByRole('button', { name: '파티 만들기' }).at(-1);
  if (button === undefined) {
    throw new Error('No 파티 만들기');
  }
  return button;
}

// Opens the date·time sheet from the field's button, and picks an hour of today.
async function pickTime(user: User, button: string, hour: string): Promise<void> {
  await user.press(screen.getByRole('button', { name: button }));
  await user.press(screen.getByRole('button', { name: hour }));
  await answer(user, '확인');
}

// The search waits for the typing to stop, then for the mock's answer.
async function searched(): Promise<void> {
  await pass(300);
  await pass(500);
}

async function pickPlace(user: User, words: string, row: string): Promise<void> {
  await user.press(screen.getByRole('button', { name: '어디서 장소 선택' }));
  await pass(500);
  await user.type(screen.getByLabelText('장소 검색'), words);
  await searched();
  await user.press(screen.getByRole('button', { name: row }));
}

describe('opening the Meetup form', () => {
  it("opens from a Friend's calendar button in the Friend panel, which closes, and goes back to the map", async () => {
    const user = await openForm();

    expect(shownAddress()).toBe('/meetup/f1?name=%EA%B9%80%EB%AF%BC%EC%A4%80');
    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
    expect(screen.getByText('1명에게 요청')).toBeVisible();
    expect(screen.getByText('김민준')).toBeVisible();
    for (const absent of ['사진', '관련 행사', '본문', '인원', '공개 범위', '게시판', '태그']) {
      expect(screen.queryByText(absent)).toBeNull();
    }
    await user.press(screen.getByRole('button', { name: '닫기' }));
    await pass(300);

    expect(shownAddress()).toBe('/main');
    expect(screen.queryByRole('header', { name: '친구 12' })).toBeNull();
  });

  it("opens from 파티 만들기 on a Friend's card", async () => {
    const user = await openMain();
    await press(user, FRIEND);

    await press(user, '파티 만들기');
    await pass(300);

    expect(shownAddress()).toMatch(/^\/meetup\/f1\?/u);
    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
  });
});

describe('the Meetup form', () => {
  it('waits for a title, a start and a place', async () => {
    const user = await openForm();
    expect(sendButton()).toBeDisabled();

    await user.type(screen.getByLabelText('제목'), '점심');
    await pickTime(user, '언제 날짜·시간 선택', '19시');
    expect(screen.getByRole('button', { name: '언제 오늘 19:00' })).toBeVisible();
    expect(sendButton()).toBeDisabled();
    await pickPlace(user, '301', '제1공학관 301동');

    expect(screen.getByRole('button', { name: '어디서 제1공학관 301동' })).toBeVisible();
    expect(sendButton()).toBeEnabled();
  });

  it('says that a start has passed, and sends nothing', async () => {
    const user = await openForm();
    await user.type(screen.getByLabelText('제목'), '점심');
    await pickTime(user, '언제 날짜·시간 선택', '10시');
    await pickPlace(user, '301', '제1공학관 301동');

    await answer(user, '파티 만들기');

    expect(screen.getByText('시작 시간이 지났어요. 다시 골라 주세요')).toBeVisible();
    expect(shownAddress()).toMatch(/^\/meetup\//u);
  });
});

describe("the Meetup form's end", () => {
  it('adds an end, says when it is not after the start, and takes it away', async () => {
    const user = await openForm();
    await pickTime(user, '언제 날짜·시간 선택', '19시');
    expect(screen.getByRole('button', { name: '끝나는 시간 선택 안 함' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: '끝나는 시간 선택 안 함' }));
    expect(screen.getAllByText('끝나는 시간').length).toBeGreaterThan(1);
    expect(screen.getAllByText('오늘 19:00')).toHaveLength(2);
    await user.press(screen.getByRole('button', { name: '18시' }));
    await answer(user, '확인');
    expect(screen.getByText('끝나는 시간이 시작 시간보다 늦어야 해요')).toBeVisible();

    await pickTime(user, '끝나는 시간 오늘 18:00', '21시');
    expect(screen.getByRole('button', { name: '끝나는 시간 오늘 21:00' })).toBeVisible();
    expect(screen.queryByText('끝나는 시간이 시작 시간보다 늦어야 해요')).toBeNull();
    await user.press(screen.getByRole('button', { name: '끝나는 시간 빼기' }));

    expect(screen.getByRole('button', { name: '끝나는 시간 선택 안 함' })).toBeVisible();
  });
});

describe('sending the Meetup form', () => {
  it('sends, says so over the map, and lists the Meetup under 초대 as sent', async () => {
    const user = await openForm();
    await user.type(screen.getByLabelText('제목'), '점심');
    await pickTime(user, '언제 날짜·시간 선택', '19시');
    await pickPlace(user, '학생', '학생회관 63동');

    await answer(user, '파티 만들기');

    expect(toast()).toHaveTextContent('김민준님에게 파티 초대를 보냈어요');
    expect(shownAddress()).toBe('/main');
    await user.press(screen.getByRole('tab', { name: /^파티/u }));
    await user.press(screen.getByRole('tab', { name: /^초대 \d+$/u }));
    await pass(500);
    expect(screen.getByRole('header', { name: '보낸 초대 · 1' })).toBeVisible();
    expect(screen.getByText('응답 대기')).toBeVisible();
    expect(screen.getByText('오늘 19:00 · 학생회관')).toBeVisible();
  });
});

describe('장소 선택 in its event mode', () => {
  it('offers 지도에서 직접 찍기 first while nothing is searched', async () => {
    const user = await openForm();

    await user.press(screen.getByRole('button', { name: '어디서 장소 선택' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '장소 선택' })).toBeVisible();
    expect(screen.getByRole('button', { name: '지도에서 직접 찍기' })).toBeVisible();
    await user.type(screen.getByLabelText('장소 검색'), '301');
    await searched();
    expect(screen.queryByRole('button', { name: '지도에서 직접 찍기' })).toBeNull();
  });

  it('says that a search found nothing, and offers the map', async () => {
    const user = await openForm();
    await user.press(screen.getByRole('button', { name: '어디서 장소 선택' }));
    await pass(500);

    await user.type(screen.getByLabelText('장소 검색'), '없는곳');
    await searched();

    expect(screen.getByText('‘없는곳’에 맞는 장소가 없어요')).toBeVisible();
    expect(screen.getByText('건물 이름이나 동 번호로 다시 찾거나, 지도에서 직접 찍어 보세요')).toBeVisible();
    expect(screen.getByRole('button', { name: '지도에서 직접 찍기' })).toBeVisible();
  });
});
