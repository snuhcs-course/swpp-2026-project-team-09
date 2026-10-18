/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { answered, startFresh } from './support/mocks';
import { ApiError } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import { apiClient } from '@/api/client';
import { addEmptyVersion, forgetLaunch, makeVersion, readVersions } from '@/features/timetable/versions';

// The timetable versions' dropdown on 내 정보's week card, the `Profile` frame, against the mocks, which start from the
// frame's four classes (seven blocks in the week).

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

function trigger(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: `시간표 버전 · ${name} (바꾸기)` });
}

function menu(): ReturnType<typeof screen.getByLabelText> {
  return screen.getByLabelText('시간표 버전');
}

async function openMenu(user: User, name: string): Promise<void> {
  await user.press(trigger(name));
}

describe('the dropdown', () => {
  it('shows 2026-2학기 beside 시간표, and the list with a check on it', async () => {
    const user = await openMe();

    expect(trigger('2026-2학기')).toHaveTextContent('2026-2학기');
    await openMenu(user, '2026-2학기');

    const options = within(menu()).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('2026-2학기');
    expect(options[0]).toBeSelected();
    expect(within(menu()).getByRole('button', { name: '이름 바꾸기' })).toBeVisible();
    expect(within(menu()).getByRole('button', { name: '이 시간표 삭제' })).toBeDisabled();
    expect(within(menu()).getByRole('button', { name: '빈 시간표 추가' })).toBeVisible();
    expect(within(menu()).getByRole('button', { name: '지금 시간표 복제' })).toBeVisible();
  });
});

describe('new versions', () => {
  it('adds an empty version, switches the week to it, and switches back', async () => {
    const user = await openMe();
    await openMenu(user, '2026-2학기');

    await user.press(screen.getByRole('button', { name: '빈 시간표 추가' }));
    expect(screen.getByTestId('version-busy')).toBeOnTheScreen();
    expect(trigger('2026-2학기')).toBeDisabled();
    await pass(3000);

    expect(screen.queryAllByTestId('class-block')).toHaveLength(0);
    await openMenu(user, '새 시간표 1');
    expect(within(menu()).getByRole('option', { name: '새 시간표 1' })).toBeSelected();
    await user.press(within(menu()).getByRole('option', { name: '2026-2학기' }));
    await pass(5000);

    expect(trigger('2026-2학기')).toBeVisible();
    expect(screen.getAllByTestId('class-block')).toHaveLength(7);
  });

  it('duplicates the current version as 복사본', async () => {
    const user = await openMe();
    await openMenu(user, '2026-2학기');

    await user.press(screen.getByRole('button', { name: '지금 시간표 복제' }));
    await pass(5000);

    expect(trigger('2026-2학기 복사본')).toBeVisible();
    expect(screen.getAllByTestId('class-block')).toHaveLength(7);
  });
});

describe('rename and delete', () => {
  it('renames inline, and an empty name keeps the old one', async () => {
    const user = await openMe();
    await openMenu(user, '2026-2학기');
    await user.press(screen.getByRole('button', { name: '이름 바꾸기' }));

    const field = screen.getByLabelText('시간표 이름');
    expect(field).toHaveDisplayValue('2026-2학기');
    expect(field.props.maxLength).toBe(20);
    await user.clear(field);
    await user.type(field, '2학기 최종', { submitEditing: true });
    await pass(500);
    expect(trigger('2학기 최종')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '이름 바꾸기' }));
    await user.clear(screen.getByLabelText('시간표 이름'));
    await user.press(screen.getByRole('button', { name: '확인' }));
    await pass(500);
    expect(trigger('2학기 최종')).toBeVisible();
  });

  it('asks before deleting, and switches to the first that remains', async () => {
    const user = await openMe();
    await openMenu(user, '2026-2학기');
    await user.press(screen.getByRole('button', { name: '빈 시간표 추가' }));
    await pass(3000);
    await openMenu(user, '새 시간표 1');

    await user.press(screen.getByRole('button', { name: '이 시간표 삭제' }));
    expect(screen.getByText('‘새 시간표 1’ 시간표를 삭제할까요?')).toBeVisible();
    await user.press(screen.getAllByRole('button', { name: '삭제' }).at(-1) ?? trigger(''));
    await pass(5000);

    expect(trigger('2026-2학기')).toBeVisible();
    expect(screen.getAllByTestId('class-block')).toHaveLength(7);
  });
});

describe('what the card says', () => {
  it('says that 10 versions are the most', async () => {
    for (let made = 1; made < 10; made += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one version after another
      await answered(addEmptyVersion());
    }
    const user = await openMe();
    await openMenu(user, '새 시간표 9');

    await user.press(screen.getByRole('button', { name: '빈 시간표 추가' }));
    await pass(500);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('시간표는 10개까지 저장할 수 있어요');
  });

  it('says when a class could not be moved, and 다시 시도 moves the rest', async () => {
    const add = mockClient.addClass;
    let failing = true;
    jest
      .spyOn(mockClient, 'addClass')
      .mockImplementation((save, key) =>
        failing && save.courseName === '알고리즘' ? Promise.reject(new ApiError(500)) : add(save, key),
      );
    const user = await openMe();
    await openMenu(user, '2026-2학기');
    await user.press(screen.getByRole('button', { name: '빈 시간표 추가' }));
    await pass(3000);
    await openMenu(user, '새 시간표 1');
    await user.press(within(menu()).getByRole('option', { name: '2026-2학기' }));
    await pass(5000);

    expect(screen.getByTestId('unfinished-switch')).toHaveTextContent(/시간표를 다 옮기지 못했어요/u);
    failing = false;
    await user.press(screen.getByRole('button', { name: '다시 시도' }));
    await pass(5000);

    expect(screen.queryByTestId('unfinished-switch')).toBeNull();
    expect(screen.getAllByTestId('class-block')).toHaveLength(7);
  });
});

describe('a failure before anything was written', () => {
  it('says that it was not saved', async () => {
    const user = await openMe();
    await openMenu(user, '2026-2학기');
    jest.spyOn(mockClient, 'listClasses').mockRejectedValueOnce(new ApiError(500));

    await user.press(screen.getByRole('button', { name: '빈 시간표 추가' }));
    await pass(1000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('저장하지 못했어요. 다시 시도해 주세요');
    expect(screen.queryByTestId('unfinished-switch')).toBeNull();
  });
});

describe('at launch', () => {
  it('finishes a switch the app left unfinished, whatever tab opens first', async () => {
    const add = mockClient.addClass;
    let failing = true;
    let calls = 0;
    jest.spyOn(mockClient, 'addClass').mockImplementation((save, key) => {
      calls += 1;
      return failing && calls >= 2 ? Promise.reject(new ApiError(500)) : add(save, key);
    });
    const classes = ['컴파일러', '데이터베이스'].map((courseName) => ({
      courseName,
      times: [{ weekday: 'monday' as const, startTime: '09:00', endTime: '10:15', placeId: null, room: null }],
    }));
    await expect(answered(makeVersion('스크린샷', classes))).rejects.toMatchObject({ status: 500 });
    failing = false;
    forgetLaunch();

    await openMain();
    await pass(3000);

    expect((await answered(readVersions())).unfinished).toBe(false);
    const names = (await answered(apiClient.listClasses())).map(({ courseName }) => courseName);
    expect(names.toSorted()).toEqual(['데이터베이스', '컴파일러']);
  });
});

describe('a class the main server refuses for good', () => {
  it('says how many classes were left out, and the switch finishes', async () => {
    const add = mockClient.addClass;
    jest
      .spyOn(mockClient, 'addClass')
      .mockImplementation((save, key) =>
        save.courseName === '알고리즘' ? Promise.reject(new ApiError(400)) : add(save, key),
      );
    const user = await openMe();
    await openMenu(user, '2026-2학기');
    await user.press(screen.getByRole('button', { name: '빈 시간표 추가' }));
    await pass(3000);
    await openMenu(user, '새 시간표 1');
    await user.press(within(menu()).getByRole('option', { name: '2026-2학기' }));
    await pass(3000);

    expect(screen.getByTestId('toast-layer')).toHaveTextContent('수업 1개는 넣지 못했어요');
    expect(screen.queryByTestId('unfinished-switch')).toBeNull();
    expect(screen.getAllByTestId('class-block')).toHaveLength(5);
  });
});
