import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ApiError } from '@/api/errors';
import { mockClient } from '@/api/mock/client';

// 시간표, the class form and the Place picker against the mocks, which start from the frame's four classes:
// 운영체제 (월·수 10:30–12:00, 제1공학관), 알고리즘 (화·목 09:30–11:00, 제2공학관 208호), 확률통계 (화 15:30–17:00,
// 대학원연구동(2단계)) and 자료구조 (수·금 14:00–15:15, 제1공학관 118호).

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

async function openTimetable(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: '직접 입력' }));
  await pass(500);
  return user;
}

function classRows(): string[] {
  return screen
    .getAllByRole('button', { name: / 수정$/u })
    .map((row) => String(row.props.accessibilityLabel).replace(/ 수정$/u, ''));
}

async function choose(user: User, select: string, choice: string): Promise<void> {
  await user.press(screen.getByRole('combobox', { name: select }));
  await user.press(screen.getByRole('button', { name: choice }));
}

// The User stops typing for 300 ms, and the search is answered.
async function searched(): Promise<void> {
  await pass(300);
  await pass(500);
}

async function pickPlace(user: User, words: string, place: string): Promise<void> {
  await user.press(screen.getByRole('button', { name: '장소 선택' }));
  await pass(500);
  await user.type(screen.getByLabelText('장소 검색'), words);
  await searched();
  await user.press(screen.getByRole('button', { name: place }));
}

// A new class: 선형대수 on the given days, 13:00 to 14:30 unless given, at 302동.
async function fillClass(user: User, days: string[], start = ['13', '00'], end = ['14', '30']): Promise<void> {
  await user.press(screen.getByRole('button', { name: '수업 추가' }));
  await pass(500);
  await user.type(screen.getByLabelText('과목명'), '선형대수');
  for (const day of days) {
    // One press after the other, as a User presses.
    // oxlint-disable-next-line no-await-in-loop
    await user.press(screen.getByRole('togglebutton', { name: day }));
  }
  await choose(user, '시작 시각 · 시', start[0] ?? '');
  await choose(user, '시작 시각 · 분', start[1] ?? '');
  await choose(user, '종료 시각 · 시', end[0] ?? '');
  await choose(user, '종료 시각 · 분', end[1] ?? '');
  await pickPlace(user, '302', '제2공학관 302동');
}

describe('the timetable', () => {
  it('lists the classes in the main server’s order with their days, hours and Places', async () => {
    await openTimetable();

    expect(screen.getByRole('header', { name: '시간표' })).toBeVisible();
    expect(screen.getByRole('header', { name: '수업 4' })).toBeVisible();
    expect(classRows()).toEqual(['운영체제', '알고리즘', '확률통계', '자료구조']);
    const os = within(screen.getByRole('button', { name: '운영체제 수정' }));
    expect(os.getByText('월·수 10:30–12:00')).toBeVisible();
    expect(os.getByText('제1공학관 301동')).toBeVisible();
    const ds = within(screen.getByRole('button', { name: '자료구조 수정' }));
    expect(ds.getByText('수·금 14:00–15:15')).toBeVisible();
    expect(ds.getByText('제1공학관 301동 118호')).toBeVisible();
    expect(screen.queryByText('겹침')).toBeNull();
    expect(screen.queryByText('학기')).toBeNull();
  });

  it('says that there are no classes', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listClasses';
    await openTimetable();

    expect(screen.getByText('등록된 수업이 없어요')).toBeVisible();
    expect(screen.getByText('수업을 넣으면 친구가 내 공강을 볼 수 있어요')).toBeVisible();
    expect(screen.getByRole('button', { name: '수업 추가' })).toBeEnabled();
  });
});

describe('the class form', () => {
  it('keeps 저장 disabled until the name, a day, both hours and a Place are there', async () => {
    const user = await openTimetable();

    await user.press(screen.getByRole('button', { name: '수업 추가' }));
    await pass(500);
    expect(screen.getByRole('header', { name: '수업 추가' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
    await user.type(screen.getByLabelText('과목명'), '선형대수');
    await user.press(screen.getByRole('togglebutton', { name: '토' }));
    await choose(user, '시작 시각 · 시', '13');
    await choose(user, '종료 시각 · 시', '14');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    await pickPlace(user, '302', '제2공학관 302동');

    expect(screen.getByRole('button', { name: '장소 선택' })).toHaveTextContent('제2공학관 302동');
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('says that the end must be after the start', async () => {
    const user = await openTimetable();

    await fillClass(user, ['토'], ['14', '00'], ['13', '30']);

    expect(screen.getByRole('alert')).toHaveTextContent('종료 시각이 시작 시각보다 늦어야 해요');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });
});

describe('adding a class', () => {
  it('adds a class and lists it', async () => {
    const user = await openTimetable();

    await fillClass(user, ['토']);
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(1000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('수업을 추가했어요');
    expect(classRows()).toEqual(['운영체제', '알고리즘', '확률통계', '자료구조', '선형대수']);
    const added = within(screen.getByRole('button', { name: '선형대수 수정' }));
    expect(added.getByText('토 13:00–14:30')).toBeVisible();
    expect(added.getByText('제2공학관 302동')).toBeVisible();
  });

  it('warns of the classes the days and hours cross, saves anyway and marks them 겹침', async () => {
    const user = await openTimetable();

    await fillClass(user, ['월', '수'], ['11', '00'], ['14', '30']);

    expect(screen.getByText('운영체제 (월·수 10:30–12:00)와 시간이 겹쳐요')).toBeVisible();
    expect(screen.getByText('자료구조 (수 14:00–15:15)와 시간이 겹쳐요')).toBeVisible();
    expect(screen.getByText('그대로 저장할 수 있어요')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(1000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('저장했어요 · 겹치는 수업이 있어요');
    for (const name of ['운영체제', '자료구조', '선형대수']) {
      expect(within(screen.getByRole('button', { name: `${name} 수정` })).getByText('겹침')).toBeVisible();
    }
    expect(within(screen.getByRole('button', { name: '알고리즘 수정' })).queryByText('겹침')).toBeNull();
  });
});

describe('changing a class', () => {
  it('opens a class with its fields and saves the change', async () => {
    const user = await openTimetable();

    await user.press(screen.getByRole('button', { name: '자료구조 수정' }));
    await pass(500);
    expect(screen.getByRole('header', { name: '수업 수정' })).toBeVisible();
    expect(screen.getByLabelText('과목명')).toHaveDisplayValue('자료구조');
    for (const [day, checked] of [
      ['수', true],
      ['금', true],
      ['월', false],
    ] as const) {
      expect(screen.getByRole('togglebutton', { name: day }).props).toMatchObject({ accessibilityState: { checked } });
    }
    expect(screen.getByRole('combobox', { name: '종료 시각 · 분' })).toHaveAccessibilityValue({ text: '15' });
    expect(screen.getByLabelText('강의실 선택')).toHaveDisplayValue('118호');
    await user.press(screen.getByRole('togglebutton', { name: '금' }));
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(1000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('수업을 수정했어요');
    const changed = within(screen.getByRole('button', { name: '자료구조 수정' }));
    expect(changed.getByText('수 14:00–15:15')).toBeVisible();
  });

  it('deletes a class after asking', async () => {
    const user = await openTimetable();

    await user.press(screen.getByRole('button', { name: '확률통계 수정' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '삭제' }));
    expect(screen.getByText('이 수업을 삭제할까요?')).toBeVisible();
    await user.press(screen.getAllByRole('button', { name: '삭제' }).at(-1) ?? screen.getByText('삭제'));
    await pass(1000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('수업을 삭제했어요');
    expect(classRows()).toEqual(['운영체제', '알고리즘', '자료구조']);
  });
});

describe('a refused save', () => {
  it.each([
    [409, 'TIMETABLE_FULL', '수업은 15개까지 넣을 수 있어요'],
    [404, 'PLACE_NOT_FOUND', '장소를 다시 골라 주세요'],
    [500, null, '저장하지 못했어요. 다시 시도해 주세요'],
  ])('stays open when the save is refused with %i %s', async (status, code, words) => {
    jest.spyOn(mockClient, 'addClass').mockRejectedValue(new ApiError(status, code));
    const user = await openTimetable();

    await fillClass(user, ['토']);
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent(words);
    expect(screen.getByRole('header', { name: '수업 추가' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });
});

describe('the Place picker', () => {
  it('lists the Places, finds by name and says when nothing is found', async () => {
    const user = await openTimetable();

    await user.press(screen.getByRole('button', { name: '수업 추가' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '장소 선택' }));
    await pass(500);
    expect(screen.getByRole('header', { name: '장소 선택' })).toBeVisible();
    expect(screen.getByRole('button', { name: '자하연' })).toBeVisible();
    expect(screen.getByRole('button', { name: '제1공학관 301동' })).toBeVisible();

    await user.type(screen.getByLabelText('장소 검색'), '공학관');
    await searched();
    expect(screen.queryByRole('button', { name: '자하연' })).toBeNull();
    expect(screen.getByRole('button', { name: '제2공학관 302동' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: '검색어 지우기' }));
    await user.type(screen.getByLabelText('장소 검색'), '없는 곳');
    await searched();
    expect(screen.getByText('‘없는 곳’에 맞는 장소가 없어요')).toBeVisible();
    expect(screen.getByText('건물 이름이나 동 번호로 다시 찾아 보세요')).toBeVisible();
    expect(screen.queryByText('지도에서 직접 찍기')).toBeNull();

    await user.press(screen.getAllByRole('button', { name: '뒤로' }).at(-1) ?? screen.getByText('장소 선택'));
    expect(screen.queryByRole('header', { name: '장소 선택' })).toBeNull();
    expect(screen.getByRole('button', { name: '장소 선택' })).toHaveTextContent('장소 선택');
  });
});
