/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { launchImageLibraryAsync } from 'expo-image-picker';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { answered, startFresh } from './support/mocks';
import { ocrOutput } from './support/timetable-ocr';
import { apiClient } from '@/api/client';
import type { OcrReading } from '@/features/timetable-ocr/native-ocr';
import { readVersions } from '@/features/timetable/versions';

// `이미지로 불러오기` end to end with ticket 02's real reading pipeline: a fake native module gives the saved OCR output
// of the reference screenshot snutt-2, and the import makes a version of what the pipeline read.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/features/timetable-ocr/native-ocr', () => ({
  hasNativeOcr: (): boolean => true,
  readImageText: (): Promise<OcrReading> => Promise.resolve(mockOcr()),
}));

function mockOcr(): OcrReading {
  return { kind: 'read', result: ocrOutput('snutt-2') };
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  jest.mocked(launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///picked/snutt-2.png', width: 1320, height: 2868 }],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

it('reads snutt-2 with the real pipeline and makes a version of its classes', async () => {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);

  await user.press(screen.getByRole('button', { name: '이미지로 불러오기' }));
  for (let step = 0; step < 100 && screen.queryByTestId('toast-layer') === null; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one step after another
    await pass(100);
  }

  expect(screen.getByTestId('toast-layer')).toHaveTextContent(/^시간표를 만들었어요/u);
  const versions = await answered(readVersions());
  expect(versions.versions).toHaveLength(2);
  expect(versions.currentId).toBe(versions.versions[1]?.id);
  const classes = await answered(apiClient.listClasses());
  expect(classes.length).toBeGreaterThan(0);
  expect(classes.map(({ courseName }) => courseName)).not.toContain('운영체제');
});
