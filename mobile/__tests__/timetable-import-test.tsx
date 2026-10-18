/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { answered, startFresh } from './support/mocks';
import { lesson, OCR, openMe, read, sixteen, tile, toast, twoClasses, untilToast } from './support/timetable-import';
import { ApiError } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import type { Place } from '@/api/types';
import type { OcrReading } from '@/features/timetable-ocr/native-ocr';
import type { Reading } from '@/features/timetable-ocr/read-timetable';
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

// The app's cache folder, and the files deleted from it.
const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///data/cache/' }, document: { uri: 'file:///data/files/' } },
  Directory: jest.fn(),
  File: jest.fn().mockImplementation((uri: string) => ({
    delete: (): void => {
      mockDeleted.push(uri);
    },
  })),
}));

let mockNative = true;
let mockReading: () => Promise<OcrReading> = () => Promise.resolve({ kind: 'read', result: OCR });
jest.mock('@/features/timetable-ocr/native-ocr', () => ({
  hasNativeOcr: (): boolean => mockNative,
  readImageText: (): Promise<OcrReading> => mockReading(),
}));

let mockRead: (places: readonly Place[]) => Reading = () => read(null, []);
jest.mock('@/features/timetable-ocr/read-timetable', () => ({
  readTimetable: (_ocr: unknown, places: readonly Place[]): Reading => mockRead(places),
}));

const pick = jest.mocked(launchImageLibraryAsync);

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  mockNative = true;
  mockReading = (): Promise<OcrReading> => Promise.resolve({ kind: 'read', result: OCR });
  mockRead = (): Reading => read(null, []);
  mockDeleted.length = 0;
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
    expect(mockDeleted).toEqual([]);
    const versions = await answered(readVersions());
    expect(versions.versions.map(({ name }) => name)).toEqual(['2026-2학기', '2026년 2학기 최종']);
    expect(versions.currentId).toBe(versions.versions[1]?.id);
  });

  it('names the version 새 시간표 N without a title, and says how many classes it could not put in', async () => {
    mockRead = (): Reading =>
      read(null, [lesson('컴파일러', 'monday', '09:00', '10:15'), lesson('', 'tuesday', '10:00', '11:00')]);
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('시간표를 만들었어요 · 1개는 넣지 못했어요');
    expect((await answered(readVersions())).versions.map(({ name }) => name)).toEqual(['2026-2학기', '새 시간표 1']);
  });
});

describe('more than 15 classes', () => {
  it('keeps the first 15 classes by day and start', async () => {
    mockRead = (): Reading => read('많은 수업', sixteen());
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent(/^16개 중 15개만 넣었어요$/u);
    await pass(1000);
    expect(screen.getAllByRole('button', { name: / 수정$/u })).toHaveLength(15);
    expect(screen.queryByRole('button', { name: 'friday 16 수정' })).toBeNull();
    expect(screen.getByRole('button', { name: 'monday 09 수정' })).toBeVisible();
  });

  it('adds what the pipeline left out to the toast', async () => {
    mockRead = (): Reading => read('많은 수업', sixteen(), 2);
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('16개 중 15개만 넣었어요 · 2개는 넣지 못했어요');
  });
});

describe('the picked image', () => {
  it('deletes the copy the picker left in the cache once read', async () => {
    pick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///data/cache/ImagePicker/shot.png', width: 1320, height: 2868 }],
    });
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(mockDeleted).toEqual(['file:///data/cache/ImagePicker/shot.png']);
  });

  it('keeps an image outside the cache untouched', async () => {
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(mockDeleted).toEqual([]);
  });
});

describe('failures', () => {
  it('says 시간표를 찾지 못했어요 when the OCR failed', async () => {
    mockReading = (): Promise<OcrReading> => Promise.resolve({ kind: 'failed', message: 'ML Kit failed' });
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('시간표를 찾지 못했어요');
  });

  it('says 저장하지 못했어요 when the album cannot open', async () => {
    pick.mockRejectedValue(new Error('no permission'));
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('저장하지 못했어요. 다시 시도해 주세요');
  });

  it('stays on 내 정보 with the versions’ toast when the switch stops', async () => {
    jest.spyOn(mockClient, 'addClass').mockRejectedValue(new ApiError(500));
    mockRead = twoClasses;
    const user = await openMe();

    await user.press(tile());
    await untilToast();

    expect(toast()).toHaveTextContent('시간표를 다 옮기지 못했어요');
    expect(screen.queryByRole('button', { name: '수업 추가' })).toBeNull();
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
