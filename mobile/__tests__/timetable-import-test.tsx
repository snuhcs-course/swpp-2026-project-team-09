/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { answered, startFresh } from './support/mocks';
import type { Place } from '@/api/types';
import { importPlan } from '@/features/timetable-ocr/import-plan';
import type { NativeOcrResult, OcrReading } from '@/features/timetable-ocr/native-ocr';
import type { ReadClass, ReadTable } from '@/features/timetable-ocr/read-timetable';
import { addEmptyVersion, readVersions } from '@/features/timetable/versions';

// `이미지로 불러오기` on 내 정보's week card (P13-04), with a fake native OCR module, a fake picker and a fake reading
// pipeline, against the mocks, which start from one version, `2026-2학기`, with the frame's four classes.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

let mockNative = true;
let mockReading: () => Promise<OcrReading> = () => Promise.resolve({ kind: 'read', result: OCR });
jest.mock('@/features/timetable-ocr/native-ocr', () => ({
  hasNativeOcr: (): boolean => mockNative,
  readImageText: (): Promise<OcrReading> => mockReading(),
}));

let mockRead: (places: readonly Place[]) => ReadTable = () => ({ title: null, classes: [] });
jest.mock('@/features/timetable-ocr/read-timetable', () => ({
  readTimetable: (_ocr: unknown, places: readonly Place[]): ReadTable => mockRead(places),
}));

const OCR: NativeOcrResult = {
  width: 1320,
  height: 2868,
  lines: [],
  pixels: { width: 330, height: 717, scale: 4, rgba: '' },
};
const pick = jest.mocked(launchImageLibraryAsync);

type User = Awaited<ReturnType<typeof openMain>>;

function lesson(name: string, weekday: ReadClass['times'][number]['weekday'], start: string, end: string): ReadClass {
  return { name, times: [{ weekday, start, end, room: null, placeId: null }] };
}

// 컴파일러 at 302동 311-1, linked with the Places the import passed, and 데이터베이스 without a building.
function twoClasses(places: readonly Place[]): ReadTable {
  const building = places.find(({ number }) => number === '302');
  return {
    title: '2026년 2학기 최종',
    classes: [
      {
        name: '컴파일러',
        times: [{ weekday: 'monday', start: '09:00', end: '10:15', room: '311-1', placeId: building?.id ?? null }],
      },
      lesson('데이터베이스', 'tuesday', '13:00', '14:15'),
    ],
  };
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  mockNative = true;
  mockReading = (): Promise<OcrReading> => Promise.resolve({ kind: 'read', result: OCR });
  mockRead = (): ReadTable => ({ title: null, classes: [] });
  pick.mockReset();
  pick.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///picked/timetable.png', width: 1320, height: 2868 }],
  });
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

function tile(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: '이미지로 불러오기' });
}

function toast(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('toast-layer');
}

// Passes time a little at a time until a toast shows, which lasts 2.4 seconds, after the reading and the switch.
async function untilToast(): Promise<void> {
  for (let step = 0; step < 100 && screen.queryByTestId('toast-layer') === null; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one step after another
    await pass(100);
  }
}

// A reading that waits until the test lets it finish.
let release: (() => void) | null = null;
function holdReading(): void {
  mockReading = (): Promise<OcrReading> =>
    new Promise((resolve) => {
      release = (): void => {
        resolve({ kind: 'read', result: OCR });
      };
    });
}

describe('reading', () => {
  it('opens the album for images only, and ignores the tile while the sheet says 시간표를 읽고 있어요', async () => {
    holdReading();
    const user = await openMe();

    await user.press(tile());
    await pass(500);
    expect(pick).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], allowsEditing: false }));
    expect(screen.getByTestId('timetable-reading')).toHaveTextContent('시간표를 읽고 있어요');
    await user.press(tile());
    expect(pick).toHaveBeenCalledTimes(1);

    release?.();
    await untilToast();
    expect(screen.queryByTestId('timetable-reading')).toBeNull();
  });
});

describe('importing a screenshot', () => {
  it('makes the version named by the title, switches to it and opens the timetable', async () => {
    mockRead = twoClasses;
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('시간표를 만들었어요');
    await pass(1000);
    expect(screen.getByRole('button', { name: '수업 추가' })).toBeVisible();
    expect(
      within(screen.getByRole('button', { name: '컴파일러 수정' })).getByText('제2공학관 302동 311-1'),
    ).toBeVisible();
    expect(within(screen.getByRole('button', { name: '데이터베이스 수정' })).getByText('장소 미정')).toBeVisible();
    const versions = await answered(readVersions());
    expect(versions.versions.map(({ name }) => name)).toEqual(['2026-2학기', '2026년 2학기 최종']);
    expect(versions.currentId).toBe(versions.versions[1]?.id);
  });

  it('names the version 새 시간표 N without a title, and says how many classes it could not put in', async () => {
    mockRead = (): ReadTable => ({
      title: null,
      classes: [lesson('컴파일러', 'monday', '09:00', '10:15'), lesson('', 'tuesday', '10:00', '11:00')],
    });
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('시간표를 만들었어요 · 1개는 넣지 못했어요');
    expect((await answered(readVersions())).versions.map(({ name }) => name)).toEqual(['2026-2학기', '새 시간표 2']);
  });
});

describe('more than 15 classes', () => {
  it('keeps the first 15 classes by day and start', async () => {
    const hours = ['09', '10', '11', '12', '13', '14', '15', '16'];
    mockRead = (): ReadTable => ({
      title: '많은 수업',
      classes: (['friday', 'monday'] as const).flatMap((weekday) =>
        hours.map((hour) => lesson(`${weekday} ${hour}`, weekday, `${hour}:00`, `${hour}:50`)),
      ),
    });
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('수업은 15개까지만 넣었어요');
    await pass(1000);
    expect(screen.getAllByRole('button', { name: / 수정$/u })).toHaveLength(15);
    expect(screen.queryByRole('button', { name: 'friday 16 수정' })).toBeNull();
    expect(screen.getByRole('button', { name: 'monday 09 수정' })).toBeVisible();
  });
});

describe('when nothing is made', () => {
  it('makes no version when no class is read', async () => {
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('시간표를 찾지 못했어요');
    expect((await answered(readVersions())).versions).toHaveLength(1);
    expect(screen.queryByTestId('timetable-reading')).toBeNull();
  });

  it('does nothing when the album is cancelled', async () => {
    pick.mockResolvedValue({ canceled: true, assets: null });
    const user = await openMe();

    await user.press(tile());
    await pass(3000);

    expect(screen.queryByTestId('toast-layer')).toBeNull();
    expect(screen.queryByTestId('timetable-reading')).toBeNull();
    expect((await answered(readVersions())).versions).toHaveLength(1);
  });

  it('reads nothing with 10 versions already', async () => {
    for (let made = 1; made < 10; made += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one version after another
      await answered(addEmptyVersion());
    }
    const user = await openMe();

    await user.press(tile());
    await pass(500);

    expect(toast()).toHaveTextContent('시간표는 10개까지 저장할 수 있어요');
    expect(pick).not.toHaveBeenCalled();
  });

  it('says 준비 중이에요 where the build has no native OCR (Expo Go, the web)', async () => {
    mockNative = false;
    const user = await openMe();

    await user.press(tile());
    await pass(500);

    expect(toast()).toHaveTextContent('준비 중이에요');
    expect(pick).not.toHaveBeenCalled();
  });
});

describe('the import plan', () => {
  it('sorts by day and start before cutting to 15, and drops a room without a building', () => {
    const classes = [
      lesson('late', 'friday', '9:00', '10:00'),
      ...Array.from({ length: 15 }, (_, index) => lesson(`m${index}`, 'monday', `${10 + (index % 9)}:00`, '19:00')),
    ];
    const plan = importPlan(
      {
        title: ' 아주 긴 시간표 이름이 스무 글자를 넘어가요 ',
        classes: [
          ...classes,
          { name: 'room', times: [{ weekday: 'monday', start: '08:00', end: '09:00', room: '311', placeId: null }] },
        ],
      },
      3,
    );

    expect(plan?.cut).toBe(true);
    expect(plan?.classes).toHaveLength(15);
    expect(plan?.classes[0]).toEqual({
      courseName: 'room',
      times: [{ weekday: 'monday', startTime: '08:00', endTime: '09:00', placeId: null, room: null }],
    });
    expect(plan?.classes.map(({ courseName }) => courseName)).not.toContain('late');
    expect(plan?.name).toBe('아주 긴 시간표 이름이 스무 글자를 넘어가요'.slice(0, 20));
    expect(importPlan({ title: '   ', classes: [lesson('a', 'monday', '09:00', '10:00')] }, 3)?.name).toBe(
      '새 시간표 4',
    );
    expect(importPlan({ title: 'x', classes: [] }, 3)).toBeNull();
  });
});
