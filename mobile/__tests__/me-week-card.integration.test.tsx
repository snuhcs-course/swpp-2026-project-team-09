/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { StyleSheet } from 'react-native';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { answered, startFresh } from './support/mocks';
import { apiClient } from '@/api/client';

// The buttons and the blocks of 내 정보's 시간표 card (P15 ticket 03), against the mocks, which start from the frame's
// four classes; 운영체제 meets on 월 and 수, 10:30–12:00 at 301동. `이미지로 불러오기` has its own tests.

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

async function openMe(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

describe('the buttons under the week', () => {
  it('are 직접 입력/수정 and 이미지로 불러오기, half the row each, without 빈 시간 말하기', async () => {
    await openMe();

    const open = screen.getByRole('button', { name: '직접 입력/수정' });
    const image = screen.getByRole('button', { name: '이미지로 불러오기' });
    expect(open.parent).toBe(image.parent);
    expect(open.parent?.children).toHaveLength(2);
    expect(open).toHaveStyle({ flex: 1 });
    expect(image).toHaveStyle({ flex: 1 });
    expect(screen.queryByText('빈 시간 말하기')).toBeNull();
    expect(screen.queryByText('직접 입력')).toBeNull();
  });

  it('open the timetable with 직접 입력/수정', async () => {
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: '직접 입력/수정' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/timetable');
    expect(screen.getByRole('header', { name: '시간표' })).toBeVisible();
  });
});

describe('a class block', () => {
  it('opens 수업 수정 filled with its class, the same class from either of its days', async () => {
    const os = (await answered(apiClient.listClasses())).find(({ courseName }) => courseName === '운영체제');
    const form = `/me/timetable/class?classId=${os?.id ?? ''}`;
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: '월요일 10:30–12:00 운영체제, 301동' }));
    await pass(500);
    expect(shownAddress()).toBe(form);
    expect(screen.getByRole('header', { name: '수업 수정' })).toBeVisible();
    expect(screen.getByLabelText('과목명')).toHaveDisplayValue('운영체제');
    for (const [day, checked] of [
      ['월', true],
      ['수', true],
      ['화', false],
    ] as const) {
      expect(screen.getByRole('togglebutton', { name: day }).props).toMatchObject({ accessibilityState: { checked } });
    }
    await user.press(screen.getByRole('button', { name: '닫기' }));
    await pass(500);
    expect(shownAddress()).toBe('/me');

    await user.press(screen.getByRole('button', { name: '수요일 10:30–12:00 운영체제, 301동' }));
    await pass(500);
    expect(shownAddress()).toBe(form);
    expect(screen.getByLabelText('과목명')).toHaveDisplayValue('운영체제');
  });
});

// The hours' labels, top to bottom.
function hourLabels(): string[] {
  return screen.getAllByLabelText(/^\d{1,2}시$/u).map((label) => String(label.props.children));
}

describe('the week (A04 ticket 07)', () => {
  it('labels 09 to 21 in two digits and shows them all, without scrolling inside the card', async () => {
    await openMe();

    expect(hourLabels()).toEqual(['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']);
    // 13 hours of 32: the Profile frame draws the grid 416 high.
    expect(screen.getByTestId('week-hours')).toHaveStyle({ height: 13 * 32 });
    expect(screen.queryByTestId('week-scroll')).toBeNull();
  });

  it('shows a class at 21:30 inside 09–21, and widens to 22 for one that runs past 22:00', async () => {
    await answered(
      apiClient.addClass({
        courseName: '야간 세미나',
        times: [{ weekday: 'friday', startTime: '21:30', endTime: '22:00', placeId: null, room: null }],
      }),
    );
    await openMe();

    expect(hourLabels().at(-1)).toBe('21');
    expect(screen.getByTestId('week-hours')).toHaveStyle({ height: 13 * 32 });
    expect(screen.getByRole('button', { name: '금요일 21:30–22:00 야간 세미나' })).toBeVisible();
    expect(screen.queryByTestId('week-scroll')).toBeNull();
  });

  it('widens to 22 for a class that runs to 22:30, shown whole without scrolling', async () => {
    await answered(
      apiClient.addClass({
        courseName: '야간 실습',
        times: [{ weekday: 'thursday', startTime: '21:30', endTime: '22:30', placeId: null, room: null }],
      }),
    );
    await openMe();

    expect(hourLabels().at(-1)).toBe('22');
    expect(screen.getByTestId('week-hours')).toHaveStyle({ height: 14 * 32 });
    expect(screen.getByRole('button', { name: '목요일 21:30–22:30 야간 실습' })).toBeVisible();
    expect(screen.queryByTestId('week-scroll')).toBeNull();
  });
});

describe('a block in the week (A04 ticket 07)', () => {
  it('keeps a one-hour class to its name over its room', async () => {
    await answered(
      apiClient.addClass({
        courseName: '한 시간',
        times: [{ weekday: 'friday', startTime: '16:00', endTime: '17:00', placeId: null, room: '101호' }],
      }),
    );
    await openMe();

    expect(screen.getByText('한 시간\n101호')).toHaveProp('numberOfLines', 2);
  });

  it('draws a class as a square block filling its column', async () => {
    await openMe();

    const block = screen.getByRole('button', { name: '월요일 10:30–12:00 운영체제, 301동' });

    expect(block).toHaveStyle({ left: 0, right: 0 });
    expect(StyleSheet.flatten(block.props.style)).not.toHaveProperty('borderRadius');
  });
});
