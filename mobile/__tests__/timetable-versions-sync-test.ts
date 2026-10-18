/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';
import { answered, startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import type { ClassSave } from '@/api/types';
import * as signIn from '@/auth/sign-in';
import * as clock from '@/clock';
import { EMPTY_DRAFT } from '@/features/timetable/class-form';
import { semesterName } from '@/features/timetable/version-parts';
import { useClassChanges } from '@/features/timetable/use-timetable';
import {
  addEmptyVersion,
  deleteCurrentVersion,
  forgetLaunch,
  makeVersion,
  noteClassesWritten,
  readVersions,
  renameCurrentVersion,
  switchVersion,
  type VersionsView,
  VersionsRefusal,
} from '@/features/timetable/versions';

// The timetable versions against the mock client, beyond one phone's own switches: a switch left unfinished when the
// app closed, classes changed on another phone, two Users on one phone and the first version's semester. The mock
// starts from the frame's four classes.

const FRAME = ['운영체제', '알고리즘', '확률통계', '자료구조'].toSorted();
const SCREENSHOT = ['데이터베이스', '인공지능', '컴파일러'];

function lesson(courseName: string): ClassSave {
  return {
    courseName,
    times: [{ weekday: 'monday', startTime: '09:00', endTime: '10:15', placeId: null, room: null }],
  };
}

function screenshot(): ClassSave[] {
  return SCREENSHOT.map((name) => lesson(name));
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  forgetLaunch();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function classNames(): Promise<string[]> {
  return (await answered(apiClient.listClasses())).map(({ courseName }) => courseName).toSorted();
}

function versions(): Promise<VersionsView> {
  return answered(readVersions());
}

function names(view: VersionsView): string[] {
  return view.versions.map(({ name }) => name);
}

function current(view: VersionsView): string | undefined {
  return view.versions.find(({ id }) => id === view.currentId)?.name;
}

function idOf(view: VersionsView, name: string): string {
  return view.versions.find((version) => version.name === name)?.id ?? '';
}

// Every add after the first fails until `heal` is called.
function failSecondAdd(): { heal: () => void } {
  const add = mockClient.addClass;
  let calls = 0;
  let failing = true;
  jest.spyOn(mockClient, 'addClass').mockImplementation((save, key) => {
    calls += 1;
    return failing && calls >= 2 ? Promise.reject(new ApiError(500)) : add(save, key);
  });
  return {
    heal: () => {
      failing = false;
    },
  };
}

const draft = { ...EMPTY_DRAFT, name: '창의공학설계', days: [4], start: '09:00', end: '10:15' };

// The class form's changes, as the timetable screens use them.
async function classChanges(): Promise<{ current: ReturnType<typeof useClassChanges> }> {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }): ReactNode =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = await renderHook(() => useClassChanges(), { wrapper });
  return result;
}

describe('a switch left unfinished when the app closed', () => {
  it('is finished at the next launch before anything else', async () => {
    const posts = failSecondAdd();
    await expect(answered(makeVersion('스크린샷', screenshot()))).rejects.toMatchObject({ status: 500 });
    expect(await classNames()).toEqual(['데이터베이스']);

    posts.heal();
    forgetLaunch();
    const view = await versions();

    expect(view.unfinished).toBe(false);
    expect(current(view)).toBe('스크린샷');
    expect(await classNames()).toEqual(SCREENSHOT.toSorted());
  });

  it('refuses every other version action while it cannot be finished', async () => {
    failSecondAdd();
    await expect(answered(makeVersion('스크린샷', screenshot()))).rejects.toMatchObject({ status: 500 });
    forgetLaunch();

    const view = await versions();
    expect(view.unfinished).toBe(true);
    const refused = new VersionsRefusal('unfinished');
    await expect(answered(switchVersion(idOf(view, '2026-2학기')))).rejects.toMatchObject(refused);
    await expect(answered(addEmptyVersion())).rejects.toMatchObject(refused);
    await expect(answered(renameCurrentVersion('다른 이름'))).rejects.toMatchObject(refused);
  });
});

describe('classes changed elsewhere', () => {
  it('are kept as 다른 기기에서 바꾼 시간표 before a switch, and nothing is written over', async () => {
    await answered(makeVersion('스크린샷', screenshot()));
    // Another phone adds a class.
    await answered(apiClient.addClass(lesson('창의공학설계')));

    await answered(switchVersion(idOf(await versions(), '2026-2학기')));

    const view = await versions();
    expect(names(view)).toEqual(['2026-2학기', '스크린샷', '다른 기기에서 바꾼 시간표']);
    expect(await classNames()).toEqual(FRAME);
    await answered(switchVersion(idOf(view, '스크린샷')));
    expect(await classNames()).toEqual(SCREENSHOT.toSorted());
    await answered(switchVersion(idOf(view, '다른 기기에서 바꾼 시간표')));
    expect(await classNames()).toEqual([...SCREENSHOT, '창의공학설계'].toSorted());
  });

  it('are not counted when this phone changed them itself', async () => {
    await answered(makeVersion('스크린샷', screenshot()));
    await answered(apiClient.addClass(lesson('창의공학설계')));
    await answered(noteClassesWritten());

    await answered(switchVersion(idOf(await versions(), '2026-2학기')));

    expect(names(await versions())).toEqual(['2026-2학기', '스크린샷']);
    await answered(switchVersion(idOf(await versions(), '스크린샷')));
    expect(await classNames()).toEqual([...SCREENSHOT, '창의공학설계'].toSorted());
  });
});

describe('classes this phone changed itself', () => {
  it('are not counted after this phone edits and deletes classes in the class form', async () => {
    await answered(makeVersion('스크린샷', screenshot()));
    const result = await classChanges();

    const added = await answered(result.current.save(null, draft));
    await answered(result.current.save(added.id, { ...draft, name: '창의설계' }));
    const [first] = await answered(apiClient.listClasses());
    await answered(result.current.remove(first?.id ?? ''));
    await answered(switchVersion(idOf(await versions(), '2026-2학기')));

    expect(names(await versions())).toEqual(['2026-2학기', '스크린샷']);
    await answered(switchVersion(idOf(await versions(), '스크린샷')));
    expect(await classNames()).toHaveLength(3);
    expect(await classNames()).toContain('창의설계');
  });

  it('are refused in the class form while a switch is unfinished', async () => {
    failSecondAdd();
    await expect(answered(makeVersion('스크린샷', screenshot()))).rejects.toMatchObject({ status: 500 });
    const result = await classChanges();

    const refused = new VersionsRefusal('unfinished');
    await expect(answered(result.current.save(null, draft))).rejects.toMatchObject(refused);
    await expect(answered(result.current.remove('class-1'))).rejects.toMatchObject(refused);
  });

  it('count nothing as changed elsewhere when they cannot be read back', async () => {
    await answered(makeVersion('스크린샷', screenshot()));
    await answered(apiClient.addClass(lesson('창의공학설계')));
    jest.spyOn(mockClient, 'listClasses').mockRejectedValueOnce(new ApiError(500));
    await answered(noteClassesWritten());

    await answered(switchVersion(idOf(await versions(), '2026-2학기')));

    expect(names(await versions())).toEqual(['2026-2학기', '스크린샷']);
  });
});

describe('classes changed elsewhere and 10 versions', () => {
  it('do not stop a delete', async () => {
    for (let made = 1; made < 10; made += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one version after another
      await answered(addEmptyVersion());
    }
    await answered(apiClient.addClass(lesson('창의공학설계')));

    await answered(deleteCurrentVersion());

    const view = await versions();
    expect(names(view)).toHaveLength(9);
    expect(current(view)).toBe('2026-2학기');
    expect(await classNames()).toEqual(FRAME);
  });

  it('refuse the switch with 10 versions already, and change nothing', async () => {
    for (let made = 1; made < 10; made += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one version after another
      await answered(addEmptyVersion());
    }
    await answered(apiClient.addClass(lesson('창의공학설계')));

    await expect(answered(switchVersion(idOf(await versions(), '2026-2학기')))).rejects.toMatchObject(
      new VersionsRefusal('too-many'),
    );
    expect(names(await versions())).toHaveLength(10);
    expect(await classNames()).toEqual(['창의공학설계']);
  });
});

describe('two Users on one phone', () => {
  it('each sees only their own versions, kept after the other signs in', async () => {
    await answered(makeVersion('스크린샷', screenshot()));
    const user = jest.spyOn(signIn, 'myUserId').mockReturnValue('user-other');

    expect(names(await versions())).toEqual(['2026-2학기']);
    await answered(renameCurrentVersion('다른 사람 시간표'));

    user.mockRestore();
    expect(names(await versions())).toEqual(['2026-2학기', '스크린샷']);
    jest.spyOn(signIn, 'myUserId').mockReturnValue('user-other');
    expect(names(await versions())).toEqual(['다른 사람 시간표']);
  });
});

describe('the first version', () => {
  it.each([
    ['2026-10-01T03:00:00Z', '2026-2학기'],
    ['2026-03-02T03:00:00Z', '2026-1학기'],
    ['2026-08-31T03:00:00Z', '2026-1학기'],
    ['2026-09-01T03:00:00Z', '2026-2학기'],
    ['2027-01-15T03:00:00Z', '2026-2학기'],
    ['2027-02-28T03:00:00Z', '2026-2학기'],
  ])('on %s is named %s', (instant, name) => {
    expect(semesterName(new Date(instant))).toBe(name);
  });

  it("is named after the semester of the app's clock", async () => {
    jest.spyOn(clock, 'now').mockReturnValue(new Date('2027-04-01T03:00:00Z'));

    expect(names(await versions())).toEqual(['2027-1학기']);
  });
});
