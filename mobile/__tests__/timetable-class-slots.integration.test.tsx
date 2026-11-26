/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// The class form's time slots (P06-11): a class whose days differ in hours or room takes a slot for each, against the
// mocks, which start from the frame's four classes.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

type User = Awaited<ReturnType<typeof openMain>>;
type Scope = Pick<ReturnType<typeof within>, 'getByRole'>;

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
  await user.press(screen.getByRole('button', { name: '직접 입력/수정' }));
  await pass(500);
  return user;
}

function slot(name: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(name));
}

// Picks the hours of a slot: the selects are its own, and their choices open under them.
async function hours(user: User, scope: Scope, start: [string, string], end: [string, string]): Promise<void> {
  for (const [select, choice] of [
    ['시작 시각 · 시', start[0]],
    ['시작 시각 · 분', start[1]],
    ['종료 시각 · 시', end[0]],
    ['종료 시각 · 분', end[1]],
  ] as const) {
    // One choice after the other, as a User makes them.
    // oxlint-disable-next-line no-await-in-loop
    await user.press(scope.getByRole('combobox', { name: select }));
    // oxlint-disable-next-line no-await-in-loop
    await user.press(screen.getByRole('button', { name: choice }));
  }
}

async function pickPlace(user: User, button: string): Promise<void> {
  await user.press(screen.getByRole('button', { name: button }));
  await pass(500);
  await user.type(screen.getByLabelText('장소 검색'), '302');
  await pass(800);
  await user.press(screen.getByRole('button', { name: '제2공학관 302동' }));
}

// 선형대수: 월 13:00–14:30 at 302동, and 수 15:00–16:15 at the same Place.
async function addTwoSlotClass(user: User): Promise<void> {
  await user.press(screen.getByRole('button', { name: '수업 추가' }));
  await pass(500);
  await user.type(screen.getByLabelText('과목명'), '선형대수');
  await user.press(screen.getByRole('togglebutton', { name: '월' }));
  await hours(user, screen, ['13', '00'], ['14', '30']);
  await pickPlace(user, '장소 선택');
  await user.press(screen.getByRole('button', { name: '다른 시간대 추가' }));

  // The hours first: until a day is chosen the slot is named 두 번째 수업, unlike any day's button.
  await hours(user, slot('두 번째 수업'), ['15', '00'], ['16', '15']);
  await user.press(slot('두 번째 수업').getByRole('togglebutton', { name: '수' }));
  await user.press(slot('수 15:00–16:15').getByRole('checkbox', { name: '월요일 수업과 같은 장소·강의실' }));
}

describe('a class with a slot per set of hours', () => {
  it('shows the hint with one slot, and with two names each, greys out the other’s days and drops the hint', async () => {
    const user = await openTimetable();
    await user.press(screen.getByRole('button', { name: '수업 추가' }));
    await pass(500);

    expect(screen.getByText('요일마다 시간이나 강의실이 다르면 시간대를 추가하세요')).toBeVisible();
    await user.press(screen.getByRole('togglebutton', { name: '월' }));
    await user.press(screen.getByRole('button', { name: '다른 시간대 추가' }));

    expect(screen.queryByText('요일마다 시간이나 강의실이 다르면 시간대를 추가하세요')).toBeNull();
    expect(screen.getByRole('button', { name: '월 삭제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '두 번째 수업 삭제' })).toBeVisible();
    const second = slot('두 번째 수업');
    expect(second.getByRole('togglebutton', { name: '월' }).props).toMatchObject({
      accessibilityState: { checked: false, disabled: true },
    });
    expect(second.getByRole('button', { name: '두 번째 수업 장소 선택' })).toBeVisible();
  });

  it('saves each slot’s days at its own hours, the second at the first’s Place, and lists them', async () => {
    const user = await openTimetable();

    await addTwoSlotClass(user);
    expect(slot('수 15:00–16:15').getByText('제2공학관 302동')).toBeVisible();
    expect(slot('수 15:00–16:15').queryByRole('button', { name: '수 15:00–16:15 장소 선택' })).toBeNull();
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(1000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('수업을 추가했어요');
    const added = within(screen.getByRole('button', { name: '선형대수 수정' }));
    expect(added.getByText('월 13:00–14:30, 수 15:00–16:15')).toBeVisible();
    expect(added.getByText('제2공학관 302동')).toBeVisible();
  });
});

describe('changing the slots', () => {
  it('opens such a class as its slots, and saving it again keeps both hours', async () => {
    const user = await openTimetable();
    await addTwoSlotClass(user);
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(1000);

    await user.press(screen.getByRole('button', { name: '선형대수 수정' }));
    await pass(500);
    expect(slot('월 13:00–14:30').getByRole('button', { name: '월 13:00–14:30 장소 선택' })).toHaveTextContent(
      '제2공학관 302동',
    );
    expect(
      slot('수 15:00–16:15').getByRole('checkbox', { name: '월요일 수업과 같은 장소·강의실' }).props,
    ).toMatchObject({ accessibilityState: { checked: true } });
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(1000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('수업을 수정했어요');
    expect(
      within(screen.getByRole('button', { name: '선형대수 수정' })).getByText('월 13:00–14:30, 수 15:00–16:15'),
    ).toBeVisible();
  });

  it('removes a slot with 삭제, and its days are free again', async () => {
    const user = await openTimetable();
    await user.press(screen.getByRole('button', { name: '수업 추가' }));
    await pass(500);
    await user.press(screen.getByRole('togglebutton', { name: '월' }));
    await user.press(screen.getByRole('button', { name: '다른 시간대 추가' }));

    await user.press(screen.getByRole('button', { name: '월 삭제' }));

    expect(screen.queryByRole('button', { name: /삭제$/u })).toBeNull();
    expect(screen.getByRole('togglebutton', { name: '월' }).props).toMatchObject({
      accessibilityState: { checked: false, disabled: false },
    });
    expect(screen.getByText('요일마다 시간이나 강의실이 다르면 시간대를 추가하세요')).toBeVisible();
  });
});
