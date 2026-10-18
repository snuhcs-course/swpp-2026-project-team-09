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
import { EMPTY_DRAFT } from '@/features/timetable/class-form';
import { useClassChanges } from '@/features/timetable/use-timetable';
import { forgetLaunch, makeVersion, readVersions } from '@/features/timetable/versions';

// Classes the main server refuses for good, and classes that break its rules before they reach it, against the mock
// client.

type Time = ClassSave['times'][number];

function time(startTime = '09:00', endTime = '10:15', room: string | null = null): Time {
  return { weekday: 'monday', startTime, endTime, placeId: null, room };
}

function lesson(courseName: string, times: Time[] = [time()]): ClassSave {
  return { courseName, times };
}

const SCREENSHOT = ['컴파일러', '데이터베이스', '인공지능'].map((name) => lesson(name));

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

// The add of 데이터베이스 is answered with `status`.
function refuseDatabase(status: number, code: string | null = null): jest.SpyInstance {
  const add = mockClient.addClass;
  return jest
    .spyOn(mockClient, 'addClass')
    .mockImplementation((save, key) =>
      save.courseName === '데이터베이스' ? Promise.reject(new ApiError(status, code)) : add(save, key),
    );
}

describe('a class the main server refuses for good', () => {
  it.each([
    [400, null],
    [404, 'PLACE_NOT_FOUND'],
    [409, 'TIMETABLE_FULL'],
  ])('is left out after %s, and the switch finishes without it', async (status, code) => {
    refuseDatabase(status, code);

    const made = await answered(makeVersion('스크린샷', SCREENSHOT));

    expect(made.refused).toBe(1);
    expect((await answered(readVersions())).unfinished).toBe(false);
    expect(await classNames()).toEqual(['인공지능', '컴파일러']);
  });

  it('leaves the class form working afterwards', async () => {
    refuseDatabase(400);
    await answered(makeVersion('스크린샷', SCREENSHOT));
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }): ReactNode =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = await renderHook(() => useClassChanges(), { wrapper });

    const draft = { ...EMPTY_DRAFT, name: '창의공학설계', days: [4], start: '09:00', end: '10:15' };
    await answered(result.current.save(null, draft));

    expect(await classNames()).toEqual(['인공지능', '창의공학설계', '컴파일러']);
  });
});

describe('a refusal that may pass later', () => {
  it.each([500, 503, 408, 429, 401])('after %s keeps the switch unfinished', async (status) => {
    refuseDatabase(status);

    await expect(answered(makeVersion('스크린샷', SCREENSHOT))).rejects.toMatchObject({ status });

    expect((await answered(readVersions())).unfinished).toBe(true);
    expect(await classNames()).toEqual(['컴파일러']);
  });
});

describe('a new version that breaks the main server’s rules', () => {
  it('leaves out the classes and times the main server would refuse, before anything on it changes', async () => {
    const add = jest.spyOn(mockClient, 'addClass');
    const classes = [
      lesson('컴파일러'),
      lesson('   '),
      lesson('가'.repeat(31)),
      lesson('  데이터베이스  ', [
        time(),
        time('10:00', '11:00'),
        time('25:00', '26:00'),
        time('15:00', '14:00'),
        time('16:00', '17:00', '가'.repeat(21)),
      ]),
      lesson('인공지능', [time('9:00', '10:00')]),
    ];

    const made = await answered(makeVersion('스크린샷', classes));

    expect(made.dropped).toEqual({ classes: 3, times: 4 });
    expect(add.mock.calls.map(([save]) => save.courseName)).toEqual(['컴파일러', '데이터베이스']);
    expect(add.mock.calls[1]?.[0].times).toEqual([time()]);
    expect(await classNames()).toEqual(['데이터베이스', '컴파일러']);
  });

  it('keeps at most 15 classes and 10 times a class', async () => {
    const tenOne = Array.from({ length: 11 }, (_, hour) =>
      time(`${String(hour + 8).padStart(2, '0')}:00`, `${String(hour + 8).padStart(2, '0')}:30`),
    );
    const classes = Array.from({ length: 16 }, (_, index) =>
      lesson(`수업 ${index + 1}`, index === 0 ? tenOne : [time()]),
    );

    const made = await answered(makeVersion('스크린샷', classes));

    expect(made.dropped).toEqual({ classes: 1, times: 1 });
    expect(await classNames()).toHaveLength(15);
  });
});
