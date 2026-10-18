/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { answered, startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import type { ClassSave } from '@/api/types';
import {
  addEmptyVersion,
  deleteCurrentVersion,
  duplicateCurrentVersion,
  makeVersion,
  readVersions,
  renameCurrentVersion,
  retrySwitch,
  switchVersion,
  type VersionsView,
  VersionsRefusal,
} from '@/features/timetable/versions';

// The timetable versions against the mock client, which starts from the frame's four classes: 운영체제, 알고리즘,
// 확률통계 and 자료구조.

const TOO_MANY = new VersionsRefusal('too-many');

const FRAME = ['운영체제', '알고리즘', '확률통계', '자료구조'];

function lesson(courseName: string, weekday: ClassSave['times'][number]['weekday'] = 'monday'): ClassSave {
  return { courseName, times: [{ weekday, startTime: '09:00', endTime: '10:15', placeId: null, room: null }] };
}

const SCREENSHOT = [lesson('컴파일러', 'monday'), lesson('데이터베이스', 'tuesday'), lesson('인공지능', 'thursday')];

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
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
  const found = view.versions.find((version) => version.name === name);
  if (found === undefined) {
    throw new Error(`No version ${name}`);
  }
  return found.id;
}

describe('first use', () => {
  it('makes the classes already on the server the version 2026-2학기', async () => {
    const view = await versions();

    expect(names(view)).toEqual(['2026-2학기']);
    expect(current(view)).toBe('2026-2학기');
    expect(view.unfinished).toBe(false);
    expect(await classNames()).toEqual(FRAME.toSorted());
  });
});

describe('switching', () => {
  it('puts the picked version on the server and brings the previous one back when it is picked again', async () => {
    await answered(makeVersion('스크린샷', SCREENSHOT));

    expect(current(await versions())).toBe('스크린샷');
    expect(await classNames()).toEqual(['데이터베이스', '인공지능', '컴파일러']);

    await answered(switchVersion(idOf(await versions(), '2026-2학기')));

    expect(current(await versions())).toBe('2026-2학기');
    expect(await classNames()).toEqual(FRAME.toSorted());

    await answered(switchVersion(idOf(await versions(), '스크린샷')));

    expect(await classNames()).toEqual(['데이터베이스', '인공지능', '컴파일러']);
  });

  it('keeps a class added to the current version before the switch', async () => {
    await answered(apiClient.addClass(lesson('창의공학설계', 'friday')));
    await answered(addEmptyVersion());
    await answered(switchVersion(idOf(await versions(), '2026-2학기')));

    expect(await classNames()).toEqual([...FRAME, '창의공학설계'].toSorted());
  });

  it('posts each class with its own Idempotency-Key', async () => {
    const add = jest.spyOn(mockClient, 'addClass');
    await answered(makeVersion('스크린샷', SCREENSHOT));

    const keys = add.mock.calls.map(([, key]) => key);
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
  });
});

describe('a failed post', () => {
  it('stops the switch, and retrying posts only the missing classes, losing none', async () => {
    const add = mockClient.addClass;
    let calls = 0;
    const spy = jest.spyOn(mockClient, 'addClass').mockImplementation((save, key) => {
      calls += 1;
      return calls === 2 ? Promise.reject(new ApiError(500)) : add(save, key);
    });

    await expect(answered(makeVersion('스크린샷', SCREENSHOT))).rejects.toMatchObject({ status: 500 });

    const stopped = await versions();
    expect(stopped.unfinished).toBe(true);
    expect(current(stopped)).toBe('스크린샷');
    expect(await classNames()).toEqual(['컴파일러']);
    await expect(answered(switchVersion(idOf(stopped, '2026-2학기')))).rejects.toThrow();

    spy.mockClear();
    await answered(retrySwitch());

    expect(spy.mock.calls.map(([save]) => save.courseName)).toEqual(['데이터베이스', '인공지능']);
    expect((await versions()).unfinished).toBe(false);
    expect(await classNames()).toEqual(['데이터베이스', '인공지능', '컴파일러']);

    await answered(switchVersion(idOf(await versions(), '2026-2학기')));
    expect(await classNames()).toEqual(FRAME.toSorted());
  });

  it('resets the server on retry when the reset itself failed', async () => {
    jest.spyOn(mockClient, 'resetTimetable').mockRejectedValueOnce(new ApiError(500));

    await expect(answered(makeVersion('스크린샷', SCREENSHOT))).rejects.toMatchObject({ status: 500 });
    expect(await classNames()).toEqual(FRAME.toSorted());

    await answered(retrySwitch());

    expect(await classNames()).toEqual(['데이터베이스', '인공지능', '컴파일러']);
  });
});

describe('rename', () => {
  it('renames the current version, at most 20 characters', async () => {
    await answered(renameCurrentVersion('  2026 가을 학기 시간표 최종 정리본입니다  '));

    expect(names(await versions())).toEqual(['2026 가을 학기 시간표 최종 정리']);
  });

  it('keeps the old name for an empty one', async () => {
    await answered(renameCurrentVersion('   '));

    expect(names(await versions())).toEqual(['2026-2학기']);
  });
});

describe('delete', () => {
  it('deletes the current version and switches to the first that remains', async () => {
    await answered(makeVersion('스크린샷', SCREENSHOT));
    await answered(deleteCurrentVersion());

    const view = await versions();
    expect(names(view)).toEqual(['2026-2학기']);
    expect(current(view)).toBe('2026-2학기');
    expect(await classNames()).toEqual(FRAME.toSorted());
  });

  it('never deletes the last version', async () => {
    await answered(deleteCurrentVersion());

    expect(names(await versions())).toEqual(['2026-2학기']);
    expect(await classNames()).toEqual(FRAME.toSorted());
  });
});

describe('new versions', () => {
  it('adds an empty one named 새 시간표 N and switches to it', async () => {
    await answered(addEmptyVersion());

    const view = await versions();
    expect(names(view)).toEqual(['2026-2학기', '새 시간표 2']);
    expect(current(view)).toBe('새 시간표 2');
    expect(await classNames()).toEqual([]);
  });

  it('duplicates the current one as {name} 복사본, cut to 20', async () => {
    await answered(renameCurrentVersion('컴퓨터공학부 2026년 2학기 본'));
    await answered(duplicateCurrentVersion());

    const view = await versions();
    expect(current(view)).toBe('컴퓨터공학부 2026년 2학기 본 복');
    expect(await classNames()).toEqual(FRAME.toSorted());
  });

  it('keeps at most 10', async () => {
    for (let made = 1; made < 10; made += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one version after another
      await answered(addEmptyVersion());
    }
    expect(names(await versions())).toHaveLength(10);

    await expect(answered(addEmptyVersion())).rejects.toMatchObject(TOO_MANY);
    await expect(answered(duplicateCurrentVersion())).rejects.toMatchObject(TOO_MANY);
    expect(names(await versions())).toHaveLength(10);
  });
});
