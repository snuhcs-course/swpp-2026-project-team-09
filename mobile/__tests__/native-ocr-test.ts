/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { hasNativeOcr, type NativeOcrResult, readImageText } from '@/features/timetable-ocr/native-ocr';

// What `requireOptionalNativeModule` finds: null by default, as in every build without the module.
let mockModule: { readImage: (uri: string) => Promise<NativeOcrResult> } | null = null;

jest.mock('expo', () => ({
  requireOptionalNativeModule: (name: string): unknown => (name === 'SnuNowOcr' ? mockModule : null),
}));

const RESULT: NativeOcrResult = {
  width: 1320,
  height: 2868,
  lines: [
    {
      text: '공학수학 2',
      box: { x: 330, y: 530, w: 160, h: 40 },
      confidence: 0.9,
      elements: [{ text: '공학수학', box: { x: 330, y: 530, w: 120, h: 40 }, confidence: 0.9 }],
    },
  ],
  pixels: { width: 330, height: 717, scale: 4, rgba: '' },
};

describe('the native OCR wrapper', () => {
  afterEach(() => {
    mockModule = null;
  });

  it('answers "unavailable" where the build has no native module (Expo Go, the web, the tests)', async () => {
    expect(hasNativeOcr()).toBe(false);
    await expect(readImageText('file:///timetable.png')).resolves.toEqual({ kind: 'unavailable' });
  });

  it('returns what the module read', async () => {
    const readImage = jest.fn((): Promise<NativeOcrResult> => Promise.resolve(RESULT));
    mockModule = { readImage };

    expect(hasNativeOcr()).toBe(true);
    await expect(readImageText('file:///timetable.png')).resolves.toEqual({ kind: 'read', result: RESULT });
    expect(readImage).toHaveBeenCalledWith('file:///timetable.png');
  });

  it('answers "failed" with the message when the module throws', async () => {
    mockModule = {
      readImage: (): Promise<NativeOcrResult> => Promise.reject(new Error('The image could not be read')),
    };

    await expect(readImageText('file:///nothing.png')).resolves.toEqual({
      kind: 'failed',
      message: 'The image could not be read',
    });
  });
});
